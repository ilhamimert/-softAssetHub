const { query } = require('../config/database');
const createError = require('http-errors');

// GET /holdings
const getAll = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT h.HoldingID, h.HoldingName, h.Description, h.Website, h.ContactEmail,
             h.LogoUrl, h.CreatedDate, h.UpdatedDate, h.IsActive,
             COUNT(DISTINCT c.ChannelID) AS ChannelCount,
             COUNT(DISTINCT a.AssetID)   AS TotalAssets
      FROM Holdings h
      LEFT JOIN Channels c ON c.HoldingID = h.HoldingID AND c.IsActive = 1
      LEFT JOIN Assets   a ON a.ChannelID = c.ChannelID  AND a.IsActive = 1
      WHERE h.IsActive = 1
      GROUP BY h.HoldingID, h.HoldingName, h.Description, h.Website,
               h.ContactEmail, h.LogoUrl, h.CreatedDate, h.UpdatedDate, h.IsActive
      ORDER BY h.HoldingName
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

// GET /holdings/:id
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT h.*,
              COUNT(DISTINCT c.ChannelID) AS ChannelCount,
              COUNT(DISTINCT a.AssetID)   AS TotalAssets
       FROM Holdings h
       LEFT JOIN Channels c ON c.HoldingID = h.HoldingID AND c.IsActive = 1
       LEFT JOIN Assets   a ON a.ChannelID = c.ChannelID  AND a.IsActive = 1
       WHERE h.HoldingID = @id AND h.IsActive = 1
       GROUP BY h.HoldingID, h.HoldingName, h.Description, h.Website,
                h.ContactEmail, h.LogoUrl, h.CreatedDate, h.UpdatedDate, h.IsActive`,
      [{ name: 'id', value: parseInt(id) }]
    );
    if (!result.recordset.length) return next(createError(404, 'Holding bulunamadı'));

    // Bağlı kanalları da getir
    const channels = await query(
      `SELECT ChannelID, ChannelName, IsActive FROM Channels WHERE HoldingID = @id AND IsActive = 1`,
      [{ name: 'id', value: parseInt(id) }]
    );
    const holding = result.recordset[0];
    holding.channels = channels.recordset;
    res.json({ success: true, data: holding });
  } catch (err) {
    next(err);
  }
};

// POST /holdings  (Admin only)
const create = async (req, res, next) => {
  try {
    const { holdingName, description, website, contactEmail, logoUrl } = req.body;
    if (!holdingName) return next(createError(400, 'holdingName zorunludur'));

    const result = await query(
      `INSERT INTO Holdings (HoldingName, Description, Website, ContactEmail, LogoUrl)
       OUTPUT INSERTED.HoldingID
       VALUES (@holdingName, @description, @website, @contactEmail, @logoUrl)`,
      [
        { name: 'holdingName',   value: holdingName },
        { name: 'description',   value: description   || null },
        { name: 'website',       value: website        || null },
        { name: 'contactEmail',  value: contactEmail   || null },
        { name: 'logoUrl',       value: logoUrl        || null },
      ]
    );
    const newId = result.recordset[0].HoldingID;
    const newHolding = await query(
      `SELECT * FROM Holdings WHERE HoldingID = @id`,
      [{ name: 'id', value: newId }]
    );
    res.status(201).json({ success: true, data: newHolding.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /holdings/:id  (Admin only)
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { holdingName, description, website, contactEmail, logoUrl } = req.body;

    const exists = await query(
      `SELECT HoldingID FROM Holdings WHERE HoldingID = @id AND IsActive = 1`,
      [{ name: 'id', value: parseInt(id) }]
    );
    if (!exists.recordset.length) return next(createError(404, 'Holding bulunamadı'));

    await query(
      `UPDATE Holdings SET
         HoldingName  = COALESCE(@holdingName, HoldingName),
         Description  = COALESCE(@description, Description),
         Website      = COALESCE(@website, Website),
         ContactEmail = COALESCE(@contactEmail, ContactEmail),
         LogoUrl      = COALESCE(@logoUrl, LogoUrl),
         UpdatedDate  = GETDATE()
       WHERE HoldingID = @id`,
      [
        { name: 'id',           value: parseInt(id) },
        { name: 'holdingName',  value: holdingName  || null },
        { name: 'description',  value: description  || null },
        { name: 'website',      value: website       || null },
        { name: 'contactEmail', value: contactEmail  || null },
        { name: 'logoUrl',      value: logoUrl       || null },
      ]
    );
    const updated = await query(
      `SELECT * FROM Holdings WHERE HoldingID = @id`,
      [{ name: 'id', value: parseInt(id) }]
    );
    res.json({ success: true, data: updated.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /holdings/:id  (Admin only - soft delete)
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exists = await query(
      `SELECT HoldingID FROM Holdings WHERE HoldingID = @id AND IsActive = 1`,
      [{ name: 'id', value: parseInt(id) }]
    );
    if (!exists.recordset.length) return next(createError(404, 'Holding bulunamadı'));

    await query(
      `UPDATE Holdings SET IsActive = 0, UpdatedDate = GETDATE() WHERE HoldingID = @id`,
      [{ name: 'id', value: parseInt(id) }]
    );
    res.json({ success: true, message: 'Holding silindi' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove };
