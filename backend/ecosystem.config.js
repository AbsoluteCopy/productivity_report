module.exports = {
  apps: [
    {
      name: 'productivity-node',
      script: './start.sh',
      interpreter: 'none',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
