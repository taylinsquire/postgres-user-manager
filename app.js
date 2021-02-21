const { Pool } = require('pg');
const express = require('express');
const app = express();
const pool = new Pool({
  user: 'postgres',
  password: 'postgres',
  database: 'mtech',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
const port = process.env.PORT || 3000;

queryDB(`Select to_regclass('public.users')`).then((data) => {
  if (data.rows[0].to_regclass == null) {
    queryDB('Create Table users(id int, first_name varchar(80), last_name varchar(80), email varchar(80), age int)');
  }
});

app.use(express.urlencoded({ extended: false }));

app.set('views', __dirname + '/views');
app.set('view engine', 'pug');

app.get('/', (req, res) => {
  res.redirect('/userlist');
});

app.get('/userlist', (req, res) => {
  let sort = req.query.sort ? (req.query.sort == 1 ? 'asc' : 'desc') : 'desc';
  queryDB(`Select * from users order by last_name ${sort} limit 10`).then((users) => {
    res.render('userList', { users: users.rows, currentUrl: req.url, queries: {} });
  });
});

app.get('/searchusers', (req, res) => {
  res.render('searchForm');
});

app.get('/filter-user-list', (req, res) => {
  let sort = req.query.sort ? (req.query.sort == 1 ? 'asc' : 'desc') : 'desc';
  console.log(req.query);
  if (req.query.fname && req.query.lname) {
    queryDB(`Select * from users where first_name = $1 AND last_name = $2 order by id ${sort} limit 10`, [req.query.fname, req.query.lname]).then(
      (users) => {
        res.render('userList', { users: users.rows, currentUrl: req.url, queries: req.query });
      }
    );
  } else if (req.query.fname) {
    queryDB(`Select * from users where first_name = $1 order by last_name ${sort} limit 10`, [req.query.fname]).then((users) => {
      res.render('userList', { users: users.rows, currentUrl: req.url, queries: req.query });
    });
  } else if (req.query.lname) {
    queryDB(`Select * from users where last_name = $1 order by first_name ${sort} limit 10`, [req.query.lname]).then((users) => {
      res.render('userList', { users: users.rows, currentUrl: req.url, queries: req.query });
    });
  }
});

app.get('/new-user-form', (req, res) => {
  res.render('newUser');
});
app.post('/new-user-form', (req, res) => {
  queryDB('Select max(id) from users').then((data) => {
    const nextID = parseInt(data.rows[0].max) + 1;
    queryDB(`Insert into users (id, first_name, last_name, email, age) values ($1, $2, $3, $4, $5)`, [
      nextID,
      req.body.fname,
      req.body.lname,
      req.body.email,
      req.body.age,
    ]).then(() => {
      res.redirect('/userlist');
    });
  });
});

app.get('/edit/:id', (req, res) => {
  queryDB('Select * from users where id = $1', [req.params.id]).then((users) => {
    res.render('editUser', { user: users.rows[0] });
  });
});
app.post('/edit/:id', (req, res) => {
  queryDB('Update users set first_name = $2, last_name = $3, email = $4, age = $5 where id = $1', [
    req.params.id,
    req.body.fname,
    req.body.lname,
    req.body.email,
    req.body.age,
  ]).then(() => {
    res.redirect('/userlist');
  });
});

app.get('/delete/:id', (req, res) => {
  queryDB('Delete from users where id = $1', [req.params.id]).then(() => {
    res.redirect('/userlist');
  });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

async function queryDB(query = 'Select * from users order by last_name, first_name asc limit 10', params = []) {
  var data;
  client = await pool.connect();
  try {
    console.log('Client connected');
    data = await client.query(query, params);
  } catch (err) {
    console.log(err);
  } finally {
    await client.release();
    console.log('Client disconnected');
    return data;
  }
}
