/**
 * PM2 – kör från projektrot på servern: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'clubpluto-backend',
      cwd: __dirname + '/backend',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
