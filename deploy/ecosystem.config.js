module.exports = {
    apps: [
        {
            name: "isofthub-backend",
            script: "./server.js",
            cwd: "../backend", // Kendi sunucu dizininize göre yolları güncelleyin
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env_production: {
                NODE_ENV: "production",
                PORT: 5000,
                // Diğer .env değişkenlerinizi sunucu seviyesinde veya burada tanımlayabilirsiniz
            }
        },
        {
            name: "isofthub-hierarchy-api",
            script: "dotnet",
            args: "run",
            cwd: "../hierarchy-web",
            instances: 1,
            autorestart: true,
            watch: false,
            env_production: {
                ASPNETCORE_ENVIRONMENT: "Production"
            }
        }
    ]
};
