const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const config = require("./config.js");
const movieModel = require("./movie-model.js");
const userModel = require("./user-model.js");

const app = express();

app.use(bodyParser.json());

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(express.static(path.join(__dirname, "files")));

function requireLogin(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.sendStatus(401);
  }
}

app.post("/login", function (req, res) {
  const { username, password } = req.body;
  const user = userModel[username];
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user = {
      username,
      firstName: user.firstName,
      lastName: user.lastName,
      loginTime: new Date().toISOString(),
    };
    res.send(req.session.user);
  } else {
    res.sendStatus(401);
  }
});

// Task 1.3: GET /logout – destroy session
app.get("/logout", function (req, res) {
  req.session.destroy(function (err) {
    if (err) {
      console.error("Session destroy error:", err);
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
  });
});

app.get("/session", function (req, res) {
  if (req.session.user) {
    res.send(req.session.user);
  } else {
    res.status(401).json(null);
  }
});

// All movie/genre/search endpoints require login
app.get("/movies", requireLogin, function (req, res) {
  const username = req.session.user.username;
  let movies = Object.values(movieModel.getUserMovies(username));
  const queriedGenre = req.query.genre;
  if (queriedGenre) {
    movies = movies.filter((movie) => movie.Genres.indexOf(queriedGenre) >= 0);
  }
  res.send(movies);
});

app.get("/movies/:imdbID", requireLogin, function (req, res) {
  const username = req.session.user.username;
  const id = req.params.imdbID;
  const movie = movieModel.getUserMovie(username, id);

  if (movie) {
    res.send(movie);
  } else {
    res.sendStatus(404);
  }
});

app.put("/movies/:imdbID", requireLogin, function (req, res) {
  const username = req.session.user.username;
  const imdbID = req.params.imdbID;
  const exists = movieModel.getUserMovie(username, imdbID) !== undefined;

  if (!exists) {
    const url = `http://www.omdbapi.com/?i=${encodeURIComponent(imdbID)}&apikey=${config.omdbApiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.omdbTimeoutMs);

    fetch(url, { signal: controller.signal })
        .then(apiRes => {
          clearTimeout(timeoutId);
          if (!apiRes.ok) {
            return res.sendStatus(apiRes.status);
          }
          return apiRes.json().then(data => {
            if (data.Response === "False") {
              return res.sendStatus(404);
            }

            const movie = {
              imdbID: data.imdbID,
              Title: data.Title,
              Released: data.Released
                  ? (() => {
                    const d = new Date(data.Released);
                    return isNaN(d.getTime()) ? data.Released : d.toISOString().split("T")[0];
                  })()
                  : null,
              Runtime: isNaN(parseInt(data.Runtime)) ? 0 : parseInt(data.Runtime),
              Genres: data.Genre ? data.Genre.split(", ").map(g => g.trim()) : [],
              Directors: data.Director ? data.Director.split(", ").map(d => d.trim()) : [],
              Writers: data.Writer ? data.Writer.split(", ").map(w => w.trim()) : [],
              Actors: data.Actors ? data.Actors.split(", ").map(a => a.trim()) : [],
              Plot: data.Plot || "",
              Poster: data.Poster && data.Poster !== "N/A" ? data.Poster : null,
              Metascore: isNaN(parseInt(data.Metascore)) ? 0 : parseInt(data.Metascore),
              imdbRating: isNaN(parseFloat(data.imdbRating)) ? 0 : parseFloat(data.imdbRating),
            };

            movieModel.setUserMovie(username, imdbID, movie);
            res.status(201).json(movie);
          });
        })
        .catch(err => {
          clearTimeout(timeoutId);
          if (err.name === "AbortError") {
            console.error("OMDb API request timeout");
            return res.sendStatus(504);
          }
          console.error("OMDb API error:", err);
          res.sendStatus(500);
        });
  } else {
    movieModel.setUserMovie(username, imdbID, req.body);
    res.sendStatus(200);
  }
});

app.delete("/movies/:imdbID", requireLogin, function (req, res) {
  const username = req.session.user.username;
  const id = req.params.imdbID;
  if (movieModel.deleteUserMovie(username, id)) {
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.get("/genres", requireLogin, function (req, res) {
  const username = req.session.user.username;
  const genres = movieModel.getGenres(username);
  genres.sort();
  res.send(genres);
});

app.get("/search", requireLogin, function (req, res) {
  const username = req.session.user.username;
  const query = req.query.query;
  if (!query) {
    return res.sendStatus(400);
  }

  const url = `http://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${config.omdbApiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.omdbTimeoutMs);

  fetch(url, { signal: controller.signal })
      .then(apiRes => {
        clearTimeout(timeoutId);
        if (!apiRes.ok) {
          return res.sendStatus(apiRes.status);
        }
        return apiRes.text().then(data => {
          let response;
          try {
            response = JSON.parse(data);
          } catch (parseError) {
            console.error("Failed to parse OMDb response:", parseError);
            return res.sendStatus(500);
          }

          if (response.Response === "True") {
            const results = response.Search
                .filter(movie => !movieModel.hasUserMovie(username, movie.imdbID))
                .map(movie => ({
                  Title: movie.Title,
                  imdbID: movie.imdbID,
                  Year: isNaN(movie.Year) ? null : parseInt(movie.Year)
                }));
            res.send(results);
          } else {
            res.send([]);
          }
        });
      })
      .catch(err => {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          console.error("OMDb API request timeout");
          return res.sendStatus(504);
        }
        console.error("OMDb API error:", err);
        res.sendStatus(500);
      });
});

app.listen(config.port);
console.log(`Server now listening on http://localhost:${config.port}/`);