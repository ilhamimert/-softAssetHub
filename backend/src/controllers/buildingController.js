const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

const getByChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const result = await query(
      `SELECT b.*,
        (SELECT COUNT(*) FROM Rooms r WHERE r.BuildingID = b.BuildingID AND r.IsActive = 1) AS RoomCount,
        (SELECT COUNT(*) FROM Assets a JOIN Rooms r ON a.RoomID = r.RoomID WHERE r.BuildingID = b.BuildingID AND a.IsActive = 1) AS AssetCount
       FROM Buildings b WHERE b.ChannelID = @channelId AND b.IsActive = 1
       ORDER BY b.BuildingName`,
      { channelId: parseInt(channelId) }
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(`SELECT * FROM Buildings WHERE BuildingID = @id`, { id: parseInt(id) });
    if (!result.recordset[0]) return next(createError('Bina bulunamadı.', 404));
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { channelId, buildingName, city, address } = req.body;
    const result = await query(
      `INSERT INTO Buildings (ChannelID, BuildingName, City, Address) OUTPUT INSERTED.* VALUES (@channelId, @buildingName, @city, @address)`,
      { channelId, buildingName, city, address }
    );
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { buildingName, city, address, isActive } = req.body;
    const result = await query(
      `UPDATE Buildings SET BuildingName = COALESCE(@buildingName, BuildingName), City = COALESCE(@city, City), Address = COALESCE(@address, Address), IsActive = COALESCE(@isActive, IsActive), UpdatedDate = GETDATE() OUTPUT INSERTED.* WHERE BuildingID = @id`,
      { id: parseInt(id), buildingName, city, address, isActive }
    );
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(`UPDATE Buildings SET IsActive = 0 WHERE BuildingID = @id`, { id: parseInt(id) });
    res.json({ success: true, message: 'Bina silindi.' });
  } catch (err) { next(err); }
};

module.exports = { getByChannel, getById, create, update, remove };
