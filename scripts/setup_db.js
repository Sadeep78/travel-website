const mysql = require('mysql2/promise');

const [,, host, port, rootUser, rootPass, dbName, newUser, newPass] = process.argv;

if (!host || !rootUser || !dbName || !newUser || !newPass) {
  console.error('Usage: node setup_db.js <host> <port> <rootUser> <rootPass> <dbName> <newUser> <newPass>');
  process.exit(1);
}

(async () => {
  try {
    const connection = await mysql.createConnection({
      host,
      port: port ? Number(port) : 3306,
      user: rootUser,
      password: rootPass,
      multipleStatements: true
    });

    console.log('Connected to MySQL as', rootUser);

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log('Ensured database', dbName);

    // Create user and grant privileges
    await connection.query(`CREATE USER IF NOT EXISTS '${newUser}'@'localhost' IDENTIFIED BY ?`, [newPass]);
    await connection.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${newUser}'@'localhost'`);
    await connection.query('FLUSH PRIVILEGES');

    console.log(`Created user ${newUser} and granted privileges on ${dbName}`);
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('Database setup failed:', err.message);
    process.exit(2);
  }
})();
