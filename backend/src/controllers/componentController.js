const { query } = require('../config/database');
const createError = require('http-errors');

// GET /assets/:assetId/components
const getByAsset = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const result = await query(
      `SELECT c.*, a.AssetName, ag.GroupName, ch.ChannelName
       FROM AssetComponents c
       JOIN Assets      a  ON a.AssetID      = c.AssetID
       JOIN AssetGroups ag ON ag.AssetGroupID = c.AssetGroupID
       JOIN Channels    ch ON ch.ChannelID    = c.ChannelID
       WHERE c.AssetID = @assetId AND c.IsActive = 1
       ORDER BY c.ComponentType, c.ComponentName`,
      [{ name: 'assetId', value: parseInt(assetId) }]
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

// GET /components/:id
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT c.*, a.AssetName, a.AssetCode, ag.GroupName, ag.GroupType, ch.ChannelName
       FROM AssetComponents c
       JOIN Assets      a  ON a.AssetID      = c.AssetID
       JOIN AssetGroups ag ON ag.AssetGroupID = c.AssetGroupID
       JOIN Channels    ch ON ch.ChannelID    = c.ChannelID
       WHERE c.ComponentID = @id AND c.IsActive = 1`,
      [{ name: 'id', value: parseInt(id) }]
    );
    if (!result.recordset.length) return next(createError(404, 'Eklenti bulunamadı'));
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// POST /components  (Technician+)
const create = async (req, res, next) => {
  try {
    const {
      assetId, componentName, componentType,
      model, serialNumber, manufacturer, specifications,
      purchaseDate, warrantyEndDate, notes,
    } = req.body;

    if (!assetId || !componentName || !componentType) {
      return next(createError(400, 'assetId, componentName ve componentType zorunludur'));
    }

    // Asset'in varlığını ve hiyerarşi bilgisini al
    const assetResult = await query(
      `SELECT AssetID, AssetGroupID, ChannelID FROM Assets WHERE AssetID = @assetId AND IsActive = 1`,
      [{ name: 'assetId', value: parseInt(assetId) }]
    );
    if (!assetResult.recordset.length) return next(createError(404, 'Varlık bulunamadı'));

    const { AssetGroupID, ChannelID } = assetResult.recordset[0];

    const result = await query(
      `INSERT INTO AssetComponents
         (AssetID, AssetGroupID, ChannelID, ComponentName, ComponentType,
          Model, SerialNumber, Manufacturer, Specifications, PurchaseDate, WarrantyEndDate, Notes)
       OUTPUT INSERTED.ComponentID
       VALUES (@assetId, @assetGroupId, @channelId, @componentName, @componentType,
               @model, @serialNumber, @manufacturer, @specifications, @purchaseDate, @warrantyEndDate, @notes)`,
      [
        { name: 'assetId',        value: parseInt(assetId) },
        { name: 'assetGroupId',   value: AssetGroupID },
        { name: 'channelId',      value: ChannelID },
        { name: 'componentName',  value: componentName },
        { name: 'componentType',  value: componentType },
        { name: 'model',          value: model           || null },
        { name: 'serialNumber',   value: serialNumber    || null },
        { name: 'manufacturer',   value: manufacturer    || null },
        { name: 'specifications', value: specifications  || null },
        { name: 'purchaseDate',   value: purchaseDate    || null },
        { name: 'warrantyEndDate',value: warrantyEndDate || null },
        { name: 'notes',          value: notes           || null },
      ]
    );

    const newId = result.recordset[0].ComponentID;
    const newComp = await query(
      `SELECT c.*, a.AssetName, ag.GroupName, ch.ChannelName
       FROM AssetComponents c
       JOIN Assets      a  ON a.AssetID      = c.AssetID
       JOIN AssetGroups ag ON ag.AssetGroupID = c.AssetGroupID
       JOIN Channels    ch ON ch.ChannelID    = c.ChannelID
       WHERE c.ComponentID = @id`,
      [{ name: 'id', value: newId }]
    );
    res.status(201).json({ success: true, data: newComp.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /components/:id  (Technician+)
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      componentName, componentType, model, serialNumber,
      manufacturer, specifications, purchaseDate, warrantyEndDate, status, notes,
    } = req.body;

    const exists = await query(
      `SELECT ComponentID FROM AssetComponents WHERE ComponentID = @id AND IsActive = 1`,
      [{ name: 'id', value: parseInt(id) }]
    );
    if (!exists.recordset.length) return next(createError(404, 'Eklenti bulunamadı'));

    await query(
      `UPDATE AssetComponents SET
         ComponentName  = COALESCE(@componentName,  ComponentName),
         ComponentType  = COALESCE(@componentType,  ComponentType),
         Model          = COALESCE(@model,          Model),
         SerialNumber   = COALESCE(@serialNumber,   SerialNumber),
         Manufacturer   = COALESCE(@manufacturer,   Manufacturer),
         Specifications = COALESCE(@specifications, Specifications),
         PurchaseDate   = COALESCE(@purchaseDate,   PurchaseDate),
         WarrantyEndDate= COALESCE(@warrantyEndDate,WarrantyEndDate),
         Status         = COALESCE(@status,         Status),
         Notes          = COALESCE(@notes,          Notes),
         UpdatedDate    = GETDATE()
       WHERE ComponentID = @id`,
      [
        { name: 'id',             value: parseInt(id) },
        { name: 'componentName',  value: componentName  || null },
        { name: 'componentType',  value: componentType  || null },
        { name: 'model',          value: model          || null },
        { name: 'serialNumber',   value: serialNumber   || null },
        { name: 'manufacturer',   value: manufacturer   || null },
        { name: 'specifications', value: specifications || null },
        { name: 'purchaseDate',   value: purchaseDate   || null },
        { name: 'warrantyEndDate',value: warrantyEndDate|| null },
        { name: 'status',         value: status         || null },
        { name: 'notes',          value: notes          || null },
      ]
    );
    const updated = await query(
      `SELECT c.*, a.AssetName, ag.GroupName, ch.ChannelName
       FROM AssetComponents c
       JOIN Assets      a  ON a.AssetID      = c.AssetID
       JOIN AssetGroups ag ON ag.AssetGroupID = c.AssetGroupID
       JOIN Channels    ch ON ch.ChannelID    = c.ChannelID
       WHERE c.ComponentID = @id`,
      [{ name: 'id', value: parseInt(id) }]
    );
    res.json({ success: true, data: updated.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /components/:id  (Manager+)
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exists = await query(
      `SELECT ComponentID FROM AssetComponents WHERE ComponentID = @id AND IsActive = 1`,
      [{ name: 'id', value: parseInt(id) }]
    );
    if (!exists.recordset.length) return next(createError(404, 'Eklenti bulunamadı'));

    await query(
      `UPDATE AssetComponents SET IsActive = 0, UpdatedDate = GETDATE() WHERE ComponentID = @id`,
      [{ name: 'id', value: parseInt(id) }]
    );
    res.json({ success: true, message: 'Eklenti silindi' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getByAsset, getById, create, update, remove };
