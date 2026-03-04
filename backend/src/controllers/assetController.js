const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

const getAll = async (req, res, next) => {
  try {
    const { search, status, assetType, channelId, roomId, sortBy = 'AssetName', sortOrder = 'ASC', page = 1, limit = 25 } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE a.IsActive = 1';
    const params = { limit: parseInt(limit), offset: parseInt(offset) };

    if (search) { where += ' AND (a.AssetName LIKE @search OR a.AssetCode LIKE @search OR a.SerialNumber LIKE @search)'; params.search = `%${search}%`; }
    if (status) { where += ' AND a.Status = @status'; params.status = status; }
    if (assetType) { where += ' AND a.AssetType = @assetType'; params.assetType = assetType; }
    if (channelId) { where += ' AND a.ChannelID = @channelId'; params.channelId = parseInt(channelId); }
    if (roomId) { where += ' AND a.RoomID = @roomId'; params.roomId = parseInt(roomId); }

    const countResult = await query(`SELECT COUNT(*) as total FROM Assets a ${where}`, params);
    const total = countResult.recordset[0].total;

    const result = await query(
      `SELECT a.*, c.ChannelName, r.RoomName, b.BuildingName, ag.GroupName,
        m.Temperature as LastTemperature, m.PowerConsumption as LastPowerConsumption, m.IsOnline
       FROM Assets a
       LEFT JOIN Channels c ON a.ChannelID = c.ChannelID
       LEFT JOIN Rooms r ON a.RoomID = r.RoomID
       LEFT JOIN Buildings b ON r.BuildingID = b.BuildingID
       LEFT JOIN AssetGroups ag ON a.AssetGroupID = ag.AssetGroupID
       LEFT JOIN (SELECT AssetID, Temperature, PowerConsumption, IsOnline, ROW_NUMBER() OVER(PARTITION BY AssetID ORDER BY Timestamp DESC) as rn FROM AssetMonitoring) m ON a.AssetID = m.AssetID AND m.rn = 1
       ${where}
       ORDER BY ${sortBy} ${sortOrder}
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      params
    );

    res.json({ success: true, data: result.recordset, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

const getTree = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT h.HoldingID, h.HoldingName, c.ChannelID, c.ChannelName, b.BuildingID, b.BuildingName, r.RoomID, r.RoomName, a.AssetID, a.AssetName, a.AssetCode, a.AssetType, a.Status
       FROM Assets a
       JOIN Rooms r ON a.RoomID = r.RoomID
       JOIN Buildings b ON r.BuildingID = b.BuildingID
       JOIN Channels c ON a.ChannelID = c.ChannelID
       LEFT JOIN Holdings h ON c.HoldingID = h.HoldingID
       WHERE a.AssetID = @id`,
      { id: parseInt(id) }
    );
    if (!result.recordset[0]) return next(createError('Varlık bulunamadı.', 404));

    const comps = await query(`SELECT * FROM AssetComponents WHERE AssetID = @id AND IsActive = 1`, { id: parseInt(id) });

    const row = result.recordset[0];
    res.json({
      success: true,
      data: {
        holding: row.HoldingID ? { id: row.HoldingID, name: row.HoldingName } : null,
        channel: { id: row.ChannelID, name: row.ChannelName },
        building: { id: row.BuildingID, name: row.BuildingName },
        room: { id: row.RoomID, name: row.RoomName },
        asset: { id: row.AssetID, name: row.AssetName, code: row.AssetCode, type: row.AssetType, status: row.Status },
        components: comps.recordset
      }
    });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { roomId, channelId, assetName, assetType, assetCode, status = 'Active' } = req.body;
    const result = await query(
      `INSERT INTO Assets (RoomID, ChannelID, AssetName, AssetType, AssetCode, Status) OUTPUT INSERTED.* VALUES (@roomId, @channelId, @assetName, @assetType, @assetCode, @status)`,
      { roomId, channelId, assetName, assetType, assetCode, status }
    );
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roomId, channelId, assetName, assetType, assetCode, status } = req.body;
    const result = await query(
      `UPDATE Assets SET RoomID = COALESCE(@roomId, RoomID), ChannelID = COALESCE(@channelId, ChannelID), AssetName = COALESCE(@assetName, AssetName), AssetType = COALESCE(@assetType, AssetType), AssetCode = COALESCE(@assetCode, AssetCode), Status = COALESCE(@status, Status), UpdatedDate = GETDATE() OUTPUT INSERTED.* WHERE AssetID = @id`,
      { id: parseInt(id), roomId, channelId, assetName, assetType, assetCode, status }
    );
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(`UPDATE Assets SET IsActive = 0 WHERE AssetID = @id`, { id: parseInt(id) });
    res.json({ success: true, message: 'Varlık silindi.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getTree, create, update, remove };
