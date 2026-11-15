
const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// API 1 - Register User
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;

  const userQuery = `
    SELECT * FROM user WHERE username = ?;
  `;

  const dbUser = await db.get(userQuery, [username]);

  if (dbUser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else if (password.length < 5) {
    response.status(400);
    response.send("Password is too short");
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);

    const createUserQuery = `
      INSERT INTO user (username, name, password, gender, location)
      VALUES (?, ?, ?, ?, ?);
    `;

    await db.run(createUserQuery, [
      username,
      name,
      hashedPassword,
      gender,
      location,
    ]);

    response.status(200);
    response.send("User created successfully");
  }
});

// API 2 - Login User
app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const userQuery = `
    SELECT * FROM user WHERE username = ?;
  `;

  const dbUser = await db.get(userQuery, [username]);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      dbUser.password
    );

    if (isPasswordMatched) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// API 3 - Change Password
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;

  const userQuery = `
    SELECT * FROM user WHERE username = ?;
  `;

  const dbUser = await db.get(userQuery, [username]);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
    return;
  }

  const isPasswordMatched = await bcrypt.compare(
    oldPassword,
    dbUser.password
  );

  if (!isPasswordMatched) {
    response.status(400);
    response.send("Invalid current password");
  } else if (newPassword.length < 5) {
    response.status(400);
    response.send("Password is too short");
  } else {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatePasswordQuery = `
      UPDATE user
      SET password = ?
      WHERE username = ?;
    `;

    await db.run(updatePasswordQuery, [
      hashedPassword,
      username,
    ]);

    response.status(200);
    response.send("Password updated");
  }
});

module.exports = app;
