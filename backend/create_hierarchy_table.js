require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'asset_hub',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

const createTablesQuery = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS physical_nodes (
    node_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES physical_nodes(node_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    node_type VARCHAR(50) NOT NULL,
    linked_asset_id INTEGER REFERENCES assets(asset_id) ON DELETE SET NULL,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS physical_audits (
    audit_id SERIAL PRIMARY KEY,
    action_type VARCHAR(50), 
    node_type VARCHAR(50),
    node_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

(async () => {
    try {
        await pool.query(createTablesQuery);
        console.log("Hierarchy tables created successfully.");
    } catch (err) {
        console.error("Error creating tables", err);
    } finally {
        pool.end();
    }
})();
