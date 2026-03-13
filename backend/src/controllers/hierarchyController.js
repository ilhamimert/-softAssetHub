const { query } = require('../config/database');
const crypto = require('crypto');

const VALID_NODE_TYPES = ['holding', 'kanal', 'bina', 'oda', 'bilgisayar', 'eklenti'];

async function addAudit(action_type, node_type, node_name) {
    try {
        await query(
            'INSERT INTO physical_audits (action_type, node_type, node_name) VALUES ($1, $2, $3)',
            [action_type, node_type, node_name]
        );
    } catch (err) {
        console.error('Audit kaydı basarisiz:', err);
    }
}

// Rekürsif ağaç olusturma fonksiyonu
const buildTree = (nodes, parentId = null) => {
    return nodes
        .filter(node => node.parentId === parentId) // camelCase from db wrapper
        .map(node => {
            const children = buildTree(nodes, node.nodeId);
            return {
                id: node.nodeId,
                name: node.name,
                path: node.nodeId, // Geri uyumluluk icin guid tutalim
                parentId: node.parentId || undefined,
                linkedAssetId: node.linkedAssetId,
                payload: node.payload,
                children: children
            };
        });
};

exports.getTree = async (req, res, next) => {
    try {
        const { recordset } = await query('SELECT * FROM physical_nodes ORDER BY created_at ASC');
        const tree = buildTree(recordset, null);
        res.json(tree);
    } catch (err) {
        next(err);
    }
};

exports.createNode = async (req, res, next) => {
    const { nodeType } = req.params; // holding, kanal, bina vs
    const Name = req.body.Name || req.body.name;
    const ParentId = req.body.ParentId || req.body.parentId;

    if (!VALID_NODE_TYPES.includes(nodeType)) {
        return res.status(400).json({ message: 'Geçersiz node tipi.' });
    }

    try {
        const parent = ParentId ? ParentId : null;
        let payload = null;
        if (nodeType === 'bilgisayar') {
            payload = { name: Name, status: "online" };
        }

        const { recordset } = await query(
            'INSERT INTO physical_nodes (parent_id, name, node_type, payload) VALUES ($1, $2, $3, $4) RETURNING *',
            [parent, Name, nodeType, payload ? JSON.stringify(payload) : null]
        );

        const newNode = recordset[0];
        await addAudit('create', nodeType, Name);

        res.json({ id: newNode.nodeId, name: newNode.name, path: newNode.nodeId });
    } catch (err) {
        next(err);
    }
};

exports.deleteNode = async (req, res, next) => {
    const { type, id } = req.params;

    try {
        const { recordset } = await query('SELECT name FROM physical_nodes WHERE node_id = $1', [id]);
        if (recordset.length === 0) {
            return res.status(404).json({ message: 'Node bulunamadi' });
        }

        await query('DELETE FROM physical_nodes WHERE node_id = $1', [id]);
        await addAudit('delete', type, recordset[0].name);

        res.json(`${type} silindi.`);
    } catch (err) {
        next(err);
    }
};

exports.moveNode = async (req, res, next) => {
    const NodeType = req.body.NodeType || req.body.nodeType;
    const NodeId = req.body.NodeId || req.body.nodeId;
    const NewParentId = req.body.NewParentId || req.body.newParentId;

    try {
        const { recordset } = await query('UPDATE physical_nodes SET parent_id = $1 WHERE node_id = $2 RETURNING *', [NewParentId, NodeId]);
        if (recordset.length === 0) {
            return res.status(404).json({ message: 'Node bulunamadi' });
        }
        await addAudit('move', NodeType, recordset[0].name);
        res.json({ id: recordset[0].nodeId, name: recordset[0].name, path: recordset[0].nodeId });
    } catch (err) {
        next(err);
    }
};

exports.linkNode = async (req, res, next) => {
    const { id } = req.params;
    const AssetId = req.body.AssetId ?? req.body.assetId ?? null;

    try {
        const { recordset } = await query('UPDATE physical_nodes SET linked_asset_id = $1 WHERE node_id = $2 RETURNING *', [AssetId || null, id]);
        if (recordset.length === 0) return res.status(404).json({ message: 'Bilgisayar bulunamadi' });

        await addAudit(AssetId ? 'link' : 'unlink', 'bilgisayar', recordset[0].name);
        res.json({ id: recordset[0].nodeId, linkedAssetId: recordset[0].linkedAssetId });
    } catch (err) {
        next(err);
    }
};

exports.renameNode = async (req, res, next) => {
    const { type, id } = req.params;
    const name = (req.body.name || req.body.Name || '').trim();
    if (!name) return res.status(400).json({ message: 'Ad gerekli' });
    try {
        const { recordset } = await query(
            'UPDATE physical_nodes SET name = $1 WHERE node_id = $2 RETURNING *',
            [name, id]
        );
        if (recordset.length === 0) return res.status(404).json({ message: 'Node bulunamadi' });
        await addAudit('rename', type, name);
        res.json({ id: recordset[0].nodeId, name: recordset[0].name });
    } catch (err) {
        next(err);
    }
};

exports.getPacket = async (req, res, next) => {
    const { id } = req.params;
    try {
        const { recordset } = await query('SELECT * FROM physical_nodes WHERE node_id = $1', [id]);
        if (recordset.length === 0) return res.status(404).json({ message: 'Bulunamadi' });

        res.json({
            totalBytes: 120,
            header: "0x20 0x01 0x21",
            path: id,
            crc16: "0xAA55",
            hexDump: "2001210024" + crypto.randomBytes(10).toString('hex').toUpperCase()
        });
    } catch (err) {
        next(err);
    }
};

exports.getAuditLog = async (req, res, next) => {
    try {
        const { recordset } = await query('SELECT action_type as "Action", node_type as "NodeType", node_name as "NodeName", created_at as "timestamp" FROM physical_audits ORDER BY created_at DESC LIMIT 200');
        res.json(recordset);
    } catch (err) {
        next(err);
    }
};

// Demo Data Loader API
exports.autoLinkNodes = async (req, res, next) => {
    try {
        // 1. Exact name match (case-insensitive)
        const { recordset: exact } = await query(`
            UPDATE physical_nodes pn
            SET linked_asset_id = a.asset_id
            FROM assets a
            WHERE pn.node_type = 'bilgisayar'
              AND pn.linked_asset_id IS NULL
              AND LOWER(pn.name) = LOWER(a.asset_name)
            RETURNING pn.node_id, pn.name, a.asset_id, a.asset_name
        `);

        // 2. Partial match: asset_name contains or is contained in node name
        const { recordset: partial } = await query(`
            UPDATE physical_nodes pn
            SET linked_asset_id = a.asset_id
            FROM assets a
            WHERE pn.node_type = 'bilgisayar'
              AND pn.linked_asset_id IS NULL
              AND (
                LOWER(a.asset_name) LIKE '%' || LOWER(pn.name) || '%'
                OR LOWER(pn.name) LIKE '%' || LOWER(a.asset_name) || '%'
              )
            RETURNING pn.node_id, pn.name, a.asset_id, a.asset_name
        `);

        const matched = [...exact, ...partial];
        for (const m of matched) {
            await addAudit('link', 'bilgisayar', m.name);
        }

        res.json({
            success: true,
            matched: matched.length,
            details: matched.map(m => ({ nodeName: m.name, assetName: m.assetName, assetId: m.assetId }))
        });
    } catch (err) {
        next(err);
    }
};

exports.loadDemoData = async (req, res, next) => {
    try {
        await query('DELETE FROM physical_nodes'); // CASCADE deletes all

        const insertNode = async (parent_id, name, node_type, payload = null) => {
            const { recordset } = await query(
                'INSERT INTO physical_nodes (parent_id, name, node_type, payload) VALUES ($1, $2, $3, $4) RETURNING node_id',
                [parent_id, name, node_type, payload ? JSON.stringify(payload) : null]
            );
            return recordset[0].nodeId;
        };

        // ── Bağımsız Kanallar ──────────────────────────────────────────
        const bagimsilar = await insertNode(null, "Bağımsız Kanallar", "holding");

        // 1. TRT
        const trt = await insertNode(bagimsilar, "TRT", "kanal");
        const trtBina = await insertNode(trt, "TRT Yayın Merkezi - Ankara", "bina");

        const trtPlayOda = await insertNode(trtBina, "Playout Odası", "oda");
        await insertNode(trtPlayOda, "GPU Tesla V100 #001", "bilgisayar", { model: "Tesla V100 32GB", ip: "10.1.1.101", rack: "Rack-A1-U1", status: "Active" });
        await insertNode(trtPlayOda, "GPU RTX 4090 #002", "bilgisayar", { model: "RTX 4090 24GB", ip: "10.1.1.102", rack: "Rack-A1-U3", status: "Active" });
        const trtPlay1 = await insertNode(trtPlayOda, "Playout Server #001", "bilgisayar", { model: "Dell PowerEdge R850", ip: "10.1.1.201", rack: "Rack-A2-U1", status: "Active" });
        await insertNode(trtPlay1, "GPU Tesla V100 (Embedded)", "eklenti");
        await insertNode(trtPlay1, "RAM DDR4 64GB #1", "eklenti");
        await insertNode(trtPlay1, "NIC 10GbE #1", "eklenti");
        await insertNode(trtPlay1, "PSU 1200W #1", "eklenti");

        const trtEncOda = await insertNode(trtBina, "Encoding Odası", "oda");
        const trtEnc1 = await insertNode(trtEncOda, "Encoder Server #001", "bilgisayar", { model: "Dell PowerEdge R760", ip: "10.1.2.101", rack: "Rack-B1-U1", status: "Active" });
        await insertNode(trtEnc1, "GPU A100 (Embedded)", "eklenti");
        await insertNode(trtEnc1, "RAM DDR4 128GB #1", "eklenti");
        await insertNode(trtEnc1, "Storage SSD 2TB #1", "eklenti");
        await insertNode(trtEncOda, "GPU A100 #001", "bilgisayar", { model: "NVIDIA A100 80GB", ip: "10.1.2.102", rack: "Rack-B1-U3", status: "Active" });

        const trtTrnOda = await insertNode(trtBina, "İletim Odası", "oda");
        await insertNode(trtTrnOda, "Network Switch #001", "bilgisayar", { model: "Cisco Nexus 9300", ip: "10.1.3.1", rack: "Rack-C1-U1", status: "Active" });
        await insertNode(trtTrnOda, "Network Router #001", "bilgisayar", { model: "Juniper QFX5120", ip: "10.1.3.2", rack: "Rack-C1-U3", status: "Active" });

        const trtArcOda = await insertNode(trtBina, "Arşiv Odası", "oda");
        await insertNode(trtArcOda, "Archive Storage #001", "bilgisayar", { model: "NetApp FAS2720", ip: "10.1.4.101", rack: "Rack-D1-U1", status: "Active" });

        const trtStrOda = await insertNode(trtBina, "Depolama Odası", "oda");
        const trtNas = await insertNode(trtStrOda, "NAS Storage #001", "bilgisayar", { model: "Synology RS3621XS+", ip: "10.1.5.101", rack: "Rack-E1-U1", status: "Active" });
        await insertNode(trtNas, "HDD 16TB #1", "eklenti");
        await insertNode(trtNas, "HDD 16TB #2", "eklenti");
        await insertNode(trtNas, "RAM DDR4 32GB #1", "eklenti");
        await insertNode(trtStrOda, "SAN Storage #001", "bilgisayar", { model: "Pure Storage FlashArray", ip: "10.1.5.102", rack: "Rack-E1-U3", status: "Maintenance" });
        await insertNode(trtStrOda, "DisplayCard RTX 4080 #001", "bilgisayar", { model: "RTX 4080 16GB", ip: "10.1.5.111", rack: "Rack-E2-U1", status: "Active" });
        await insertNode(trtStrOda, "DisplayCard RTX 4070 #001", "bilgisayar", { model: "RTX 4070 12GB", ip: "10.1.5.112", rack: "Rack-E2-U3", status: "Active" });

        // 2. Ekol TV
        const ekol = await insertNode(bagimsilar, "Ekol TV", "kanal");
        const ekolBina = await insertNode(ekol, "Ekol TV Yayın Merkezi - İstanbul", "bina");
        const ekolPlayOda = await insertNode(ekolBina, "Playout Odası", "oda");
        await insertNode(ekolPlayOda, "GPU RTX 4080 #001", "bilgisayar", { model: "RTX 4080 16GB", ip: "10.3.1.101", rack: "Rack-A1-U1", status: "Active" });
        await insertNode(ekolPlayOda, "Playout Server #001", "bilgisayar", { model: "Dell PowerEdge R640", ip: "10.3.1.201", rack: "Rack-A2-U1", status: "Active" });

        const ekolEncOda = await insertNode(ekolBina, "Encoding Odası", "oda");
        await insertNode(ekolEncOda, "Encoder Server #001", "bilgisayar", { model: "Lenovo ThinkSystem SR650", ip: "10.3.2.101", rack: "Rack-B1-U1", status: "Faulty" });

        const ekolStrOda = await insertNode(ekolBina, "Depolama Odası", "oda");
        await insertNode(ekolStrOda, "NAS Storage #001", "bilgisayar", { model: "Dell EMC PowerStore 3000T", ip: "10.3.3.101", rack: "Rack-C1-U1", status: "Active" });
        await insertNode(ekolStrOda, "DisplayCard RTX 4090 #001", "bilgisayar", { model: "RTX 4090 24GB", ip: "10.3.3.111", rack: "Rack-C2-U1", status: "Active" });

        // 3. CNBC-e
        const cnbce = await insertNode(bagimsilar, "CNBC-e", "kanal");
        const cnbBina = await insertNode(cnbce, "CNBC-e Yayın Merkezi - İstanbul", "bina");
        const cnbPlayOda = await insertNode(cnbBina, "Playout Odası", "oda");
        await insertNode(cnbPlayOda, "GPU A100 #001", "bilgisayar", { model: "NVIDIA A100 80GB", ip: "10.5.1.101", rack: "Rack-A1-U1", status: "Active" });
        await insertNode(cnbPlayOda, "Playout Server #001", "bilgisayar", { model: "Dell PowerEdge R740", ip: "10.5.1.201", rack: "Rack-A2-U1", status: "Active" });

        const cnbTrnOda = await insertNode(cnbBina, "İletim Odası", "oda");
        await insertNode(cnbTrnOda, "Network Switch #001", "bilgisayar", { model: "Cisco Catalyst 9500", ip: "10.5.2.1", rack: "Rack-B1-U1", status: "Active" });
        await insertNode(cnbTrnOda, "Network Router #001", "bilgisayar", { model: "MikroTik CRS354", ip: "10.5.2.2", rack: "Rack-B1-U3", status: "Inactive" });

        const cnbStrOda = await insertNode(cnbBina, "Depolama Odası", "oda");
        await insertNode(cnbStrOda, "SAN Storage #001", "bilgisayar", { model: "Pure Storage FlashArray", ip: "10.5.3.101", rack: "Rack-C1-U1", status: "Active" });
        await insertNode(cnbStrOda, "DisplayCard RTX 3060 #001", "bilgisayar", { model: "RTX 3060 12GB", ip: "10.5.3.111", rack: "Rack-C2-U1", status: "Active" });

        // 4. Now TV
        const nowTv = await insertNode(bagimsilar, "Now TV", "kanal");
        const nowBina = await insertNode(nowTv, "Now TV Yayın Merkezi - İstanbul", "bina");
        const nowPlayOda = await insertNode(nowBina, "Playout Odası", "oda");
        await insertNode(nowPlayOda, "GPU RTX 4090 #001", "bilgisayar", { model: "RTX 4090 24GB", ip: "10.6.1.101", rack: "Rack-A1-U1", status: "Active" });
        await insertNode(nowPlayOda, "Playout Server #001", "bilgisayar", { model: "Lenovo ThinkSystem SR630", ip: "10.6.1.201", rack: "Rack-A2-U1", status: "Active" });

        const nowEncOda = await insertNode(nowBina, "Encoding Odası", "oda");
        await insertNode(nowEncOda, "Encoder Server #001", "bilgisayar", { model: "Dell PowerEdge R760", ip: "10.6.2.101", rack: "Rack-B1-U1", status: "Active" });

        const nowStrOda = await insertNode(nowBina, "Depolama Odası", "oda");
        await insertNode(nowStrOda, "NAS Storage #001", "bilgisayar", { model: "Synology RS3621XS+", ip: "10.6.3.101", rack: "Rack-C1-U1", status: "Active" });

        // 5. Digiturk
        const digiturk = await insertNode(bagimsilar, "Digiturk", "kanal");
        const dgtBina = await insertNode(digiturk, "Digiturk Yayın Merkezi - İstanbul", "bina");
        const dgtPlayOda = await insertNode(dgtBina, "Playout Odası", "oda");
        await insertNode(dgtPlayOda, "GPU Tesla V100 #001", "bilgisayar", { model: "Tesla V100 32GB", ip: "10.7.1.101", rack: "Rack-A1-U1", status: "Maintenance" });
        const dgtPlay1 = await insertNode(dgtPlayOda, "Playout Server #001", "bilgisayar", { model: "Dell PowerEdge R850", ip: "10.7.1.201", rack: "Rack-A2-U1", status: "Active" });
        await insertNode(dgtPlay1, "GPU Tesla V100 (Embedded)", "eklenti");
        await insertNode(dgtPlay1, "RAM DDR4 256GB #1", "eklenti");
        await insertNode(dgtPlay1, "NIC 25GbE #1", "eklenti");

        const dgtEncOda = await insertNode(dgtBina, "Encoding Odası", "oda");
        await insertNode(dgtEncOda, "Encoder Server #001", "bilgisayar", { model: "HPE ProLiant DL360 Gen10", ip: "10.7.2.101", rack: "Rack-B1-U1", status: "Active" });

        const dgtTrnOda = await insertNode(dgtBina, "İletim Odası", "oda");
        await insertNode(dgtTrnOda, "Uplink Router #001", "bilgisayar", { model: "Cisco Nexus 9300", ip: "10.7.3.1", rack: "Rack-C1-U1", status: "Active" });

        const dgtArcOda = await insertNode(dgtBina, "Arşiv Odası", "oda");
        await insertNode(dgtArcOda, "Archive Storage #001", "bilgisayar", { model: "NetApp AFF A250", ip: "10.7.4.101", rack: "Rack-D1-U1", status: "Active" });

        const dgtStrOda = await insertNode(dgtBina, "Depolama Odası", "oda");
        await insertNode(dgtStrOda, "SAN Storage #001", "bilgisayar", { model: "Pure Storage FlashArray", ip: "10.7.5.101", rack: "Rack-E1-U1", status: "Active" });
        await insertNode(dgtStrOda, "DisplayCard RTX 4080 #001", "bilgisayar", { model: "RTX 4080 16GB", ip: "10.7.5.111", rack: "Rack-E2-U1", status: "Active" });

        // 6. TGRT Haber
        const tgrt = await insertNode(bagimsilar, "TGRT Haber", "kanal");
        const tgrtBina = await insertNode(tgrt, "TGRT Haber Yayın Merkezi - İstanbul", "bina");
        const tgrtPlayOda = await insertNode(tgrtBina, "Playout Odası", "oda");
        await insertNode(tgrtPlayOda, "GPU RTX A5000 #001", "bilgisayar", { model: "NVIDIA RTX A5000", ip: "10.8.1.101", rack: "Rack-A1-U1", status: "Active" });
        await insertNode(tgrtPlayOda, "Playout Server #001", "bilgisayar", { model: "Dell PowerEdge R740", ip: "10.8.1.201", rack: "Rack-A2-U1", status: "Active" });

        const tgrtEncOda = await insertNode(tgrtBina, "Encoding Odası", "oda");
        await insertNode(tgrtEncOda, "Encoder Server #001", "bilgisayar", { model: "Lenovo ThinkSystem SR650", ip: "10.8.2.101", rack: "Rack-B1-U1", status: "Active" });

        const tgrtStrOda = await insertNode(tgrtBina, "Depolama Odası", "oda");
        await insertNode(tgrtStrOda, "NAS Storage #001", "bilgisayar", { model: "Dell EMC PowerStore 1000T", ip: "10.8.3.101", rack: "Rack-C1-U1", status: "Active" });
        await insertNode(tgrtStrOda, "DisplayCard RTX 3080 #001", "bilgisayar", { model: "RTX 3080 10GB", ip: "10.8.3.111", rack: "Rack-C2-U1", status: "Active" });

        // ── Demirören Medya Holding ─────────────────────────────────────
        const dmrHolding = await insertNode(null, "Demirören Medya", "holding");
        const demioren = await insertNode(dmrHolding, "Demirören Medya", "kanal");
        const dmrBina = await insertNode(demioren, "Demirören Medya Yayın Merkezi - İstanbul", "bina");

        const dmrPlayOda = await insertNode(dmrBina, "Playout Odası", "oda");
        await insertNode(dmrPlayOda, "GPU Tesla T4 #001", "bilgisayar", { model: "NVIDIA Tesla T4", ip: "10.4.1.101", rack: "Rack-A1-U1", status: "Active" });
        await insertNode(dmrPlayOda, "Playout Server #001", "bilgisayar", { model: "Dell PowerEdge R650", ip: "10.4.1.201", rack: "Rack-A2-U1", status: "Active" });

        const dmrEncOda = await insertNode(dmrBina, "Encoding Odası", "oda");
        await insertNode(dmrEncOda, "Encoder Server #001", "bilgisayar", { model: "HPE ProLiant DL380 Gen10", ip: "10.4.2.101", rack: "Rack-B1-U1", status: "Active" });
        await insertNode(dmrEncOda, "GPU A4000 #001", "bilgisayar", { model: "NVIDIA RTX A4000", ip: "10.4.2.102", rack: "Rack-B1-U3", status: "Active" });

        const dmrArcOda = await insertNode(dmrBina, "Arşiv Odası", "oda");
        await insertNode(dmrArcOda, "Archive Server #001", "bilgisayar", { model: "NetApp AFF A250", ip: "10.4.3.101", rack: "Rack-C1-U1", status: "Active" });
        await insertNode(dmrArcOda, "DisplayCard RTX 3070 #001", "bilgisayar", { model: "RTX 3070 8GB", ip: "10.4.3.111", rack: "Rack-C2-U1", status: "Active" });

        // Kanal D
        const kanalD = await insertNode(dmrHolding, "Kanal D", "kanal");
        const kdBina = await insertNode(kanalD, "Kanal D Merkez Bina - Kavacık", "bina");
        const kdPlayOda = await insertNode(kdBina, "Yayın Kontrol Odası", "oda");
        await insertNode(kdPlayOda, "Playout Server #001", "bilgisayar", { model: "HP ProLiant DL380", ip: "10.9.1.101", rack: "Rack-A1-U1", status: "Active" });
        await insertNode(kdPlayOda, "GPU RTX 4090 #001", "bilgisayar", { model: "RTX 4090 24GB", ip: "10.9.1.102", rack: "Rack-A1-U2", status: "Active" });
        await insertNode(kdPlayOda, "Encoder Server #001", "bilgisayar", { model: "Dell PowerEdge R750", ip: "10.9.1.103", rack: "Rack-A1-U3", status: "Active" });

        const kdTekOda = await insertNode(kdBina, "Teknik Altyapı Odası", "oda");
        await insertNode(kdTekOda, "Network Switch #001", "bilgisayar", { model: "Cisco Catalyst 9300", ip: "10.9.1.201", rack: "Rack-C1-U1", status: "Active" });
        await insertNode(kdTekOda, "NAS Storage #001", "bilgisayar", { model: "Synology RS3621xs+", ip: "10.9.1.202", rack: "Rack-C1-U3", status: "Active" });
        await insertNode(kdTekOda, "DisplayCard RTX 4080 #001", "bilgisayar", { model: "RTX 4080 16GB", ip: "10.9.1.203", rack: "Rack-C1-U5", status: "Active" });

        // CNN Türk
        const cnnTurk = await insertNode(dmrHolding, "CNN Türk", "kanal");
        const cnnBina = await insertNode(cnnTurk, "CNN Türk Merkez Bina - Kavacık", "bina");
        const cnnPlayOda = await insertNode(cnnBina, "Yayın Kontrol Odası", "oda");
        await insertNode(cnnPlayOda, "Playout Server #001", "bilgisayar", { model: "HP ProLiant DL360", ip: "10.10.1.101", rack: "Rack-A1-U1", status: "Active" });
        await insertNode(cnnPlayOda, "GPU A100 #001", "bilgisayar", { model: "A100 80GB", ip: "10.10.1.102", rack: "Rack-A1-U2", status: "Active" });
        await insertNode(cnnPlayOda, "Live Encoder #001", "bilgisayar", { model: "SuperMicro 6029P", ip: "10.10.1.103", rack: "Rack-A1-U3", status: "Maintenance" });

        const cnnTekOda = await insertNode(cnnBina, "Teknik Altyapı Odası", "oda");
        await insertNode(cnnTekOda, "Network Router #001", "bilgisayar", { model: "Juniper MX204", ip: "10.10.1.201", rack: "Rack-B1-U1", status: "Active" });
        await insertNode(cnnTekOda, "SAN Storage #001", "bilgisayar", { model: "NetApp AFF A400", ip: "10.10.1.202", rack: "Rack-B1-U3", status: "Active" });
        await insertNode(cnnTekOda, "UPS #001", "bilgisayar", { model: "APC Smart-UPS 3000", ip: "10.10.1.203", rack: "Rack-B1-U6", status: "Active" });

        // ── Turkuaz Medya Holding ───────────────────────────────────────
        const turkHolding = await insertNode(null, "Turkuaz Medya", "holding");
        const turkuaz = await insertNode(turkHolding, "Turkuaz Medya", "kanal");
        const turkBina = await insertNode(turkuaz, "Turkuaz Medya Yayın Merkezi - İstanbul", "bina");

        const turkPlayOda = await insertNode(turkBina, "Playout Odası", "oda");
        await insertNode(turkPlayOda, "GPU A6000 #001", "bilgisayar", { model: "NVIDIA RTX A6000", ip: "10.2.1.101", rack: "Rack-A1-U1", status: "Active" });
        await insertNode(turkPlayOda, "Playout Server #001", "bilgisayar", { model: "HPE ProLiant DL380 Gen10", ip: "10.2.1.201", rack: "Rack-A2-U1", status: "Active" });

        const turkEncOda = await insertNode(turkBina, "Encoding Odası", "oda");
        await insertNode(turkEncOda, "Encoder Server #001", "bilgisayar", { model: "Dell PowerEdge R750", ip: "10.2.2.101", rack: "Rack-B1-U1", status: "Active" });
        await insertNode(turkEncOda, "GPU A5000 #001", "bilgisayar", { model: "NVIDIA RTX A5000", ip: "10.2.2.102", rack: "Rack-B1-U3", status: "Active" });

        const turkTrnOda = await insertNode(turkBina, "İletim Odası", "oda");
        await insertNode(turkTrnOda, "Network Switch #001", "bilgisayar", { model: "Arista 7050CX3", ip: "10.2.3.1", rack: "Rack-C1-U1", status: "Active" });

        const turkStrOda = await insertNode(turkBina, "Depolama Odası", "oda");
        await insertNode(turkStrOda, "NAS Storage #001", "bilgisayar", { model: "Synology RS3621XS+", ip: "10.2.4.101", rack: "Rack-D1-U1", status: "Active" });
        await insertNode(turkStrOda, "DisplayCard RTX 3080 #001", "bilgisayar", { model: "RTX 3080 10GB", ip: "10.2.4.111", rack: "Rack-D2-U1", status: "Active" });

        // ATV
        const atv = await insertNode(turkHolding, "ATV", "kanal");
        const atvBina = await insertNode(atv, "ATV Merkez Bina - Esenyurt", "bina");
        const atvPlayOda = await insertNode(atvBina, "Yayın Kontrol Odası", "oda");
        await insertNode(atvPlayOda, "Playout Server #001", "bilgisayar", { model: "Dell PowerEdge R740", ip: "10.11.1.101", rack: "Rack-A1-U1", status: "Active" });
        await insertNode(atvPlayOda, "GPU RTX 4080 #001", "bilgisayar", { model: "RTX 4080 16GB", ip: "10.11.1.102", rack: "Rack-A1-U2", status: "Active" });
        await insertNode(atvPlayOda, "Encoder Server #001", "bilgisayar", { model: "HP ProLiant DL380", ip: "10.11.1.103", rack: "Rack-A1-U3", status: "Active" });

        const atvTekOda = await insertNode(atvBina, "Teknik Altyapı Odası", "oda");
        await insertNode(atvTekOda, "Network Switch #001", "bilgisayar", { model: "Cisco Catalyst 9200", ip: "10.11.1.201", rack: "Rack-B1-U1", status: "Active" });
        await insertNode(atvTekOda, "NAS Storage #001", "bilgisayar", { model: "QNAP TS-h1683XU", ip: "10.11.1.202", rack: "Rack-B1-U3", status: "Active" });
        await insertNode(atvTekOda, "DisplayCard RTX 4070 #001", "bilgisayar", { model: "RTX 4070 12GB", ip: "10.11.1.203", rack: "Rack-B1-U5", status: "Active" });

        // A2
        const a2 = await insertNode(turkHolding, "A2", "kanal");
        const a2Bina = await insertNode(a2, "A2 Teknik Bina - Esenyurt", "bina");
        const a2PlayOda = await insertNode(a2Bina, "Yayın Kontrol Odası", "oda");
        await insertNode(a2PlayOda, "Playout Server #001", "bilgisayar", { model: "Dell PowerEdge R640", ip: "10.12.1.101", rack: "Rack-A1-U1", status: "Active" });
        await insertNode(a2PlayOda, "GPU Tesla T4 #001", "bilgisayar", { model: "Tesla T4 16GB", ip: "10.12.1.102", rack: "Rack-A1-U2", status: "Active" });
        await insertNode(a2PlayOda, "Encoder Server #001", "bilgisayar", { model: "Lenovo ThinkSystem SR650", ip: "10.12.1.103", rack: "Rack-A1-U3", status: "Maintenance" });

        const a2TekOda = await insertNode(a2Bina, "Teknik Altyapı Odası", "oda");
        await insertNode(a2TekOda, "Network Switch #001", "bilgisayar", { model: "HPE Aruba 2930F", ip: "10.12.1.201", rack: "Rack-B1-U1", status: "Active" });
        await insertNode(a2TekOda, "Archive Storage #001", "bilgisayar", { model: "Western Digital 100TB", ip: "10.12.1.202", rack: "Rack-B1-U3", status: "Active" });

        // A Haber
        const aHaber = await insertNode(turkHolding, "A Haber", "kanal");
        const ahBina = await insertNode(aHaber, "A Haber Merkez Bina - Esenyurt", "bina");
        const ahPlayOda = await insertNode(ahBina, "Yayın Kontrol Odası", "oda");
        await insertNode(ahPlayOda, "Playout Server #001", "bilgisayar", { model: "HP ProLiant DL380 G10", ip: "10.13.1.101", rack: "Rack-A1-U1", status: "Active" });
        await insertNode(ahPlayOda, "GPU RTX 3090 #001", "bilgisayar", { model: "RTX 3090 24GB", ip: "10.13.1.102", rack: "Rack-A1-U2", status: "Active" });
        await insertNode(ahPlayOda, "Live News Encoder #001", "bilgisayar", { model: "Dell PowerEdge R750xa", ip: "10.13.1.103", rack: "Rack-A1-U3", status: "Active" });

        const ahTekOda = await insertNode(ahBina, "Teknik Altyapı Odası", "oda");
        await insertNode(ahTekOda, "Network Router #001", "bilgisayar", { model: "Cisco ASR 1002-X", ip: "10.13.1.201", rack: "Rack-B1-U1", status: "Active" });
        await insertNode(ahTekOda, "SAN Storage #001", "bilgisayar", { model: "Pure Storage FlashArray", ip: "10.13.1.202", rack: "Rack-B1-U3", status: "Active" });
        await insertNode(ahTekOda, "UPS #001", "bilgisayar", { model: "Eaton 9PX 3000i", ip: "10.13.1.203", rack: "Rack-B1-U6", status: "Active" });

        res.json('ISOFTASSETHUB PostgreSQL demo verisi saniyeler icinde yuklendi: 3 Grup, 13 Kanal, 13 Bina, 50+ Bilgisayar.');
    } catch (err) {
        next(err);
    }
};
