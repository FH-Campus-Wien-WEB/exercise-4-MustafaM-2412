const fs = require('fs');
const path = require('path');

const moviesFile = path.join(__dirname, 'movies.json');
let movies = JSON.parse(fs.readFileSync(moviesFile, 'utf8'));

function saveMovies() {
  fs.writeFileSync(moviesFile, JSON.stringify(movies, null, 2), 'utf8');
}

function getUserMovies(username) {
  return movies[username] || {};
}

function getUserMovie(username, imdbID) {
  return getUserMovies(username)[imdbID];
}

function hasUserMovie(username, imdbID) {
  return getUserMovie(username, imdbID) !== undefined;
}

function setUserMovie(username, imdbID, movie) {
  if (!movies[username]) movies[username] = {};
  movies[username][imdbID] = movie;
  saveMovies();
}

function deleteUserMovie(username, imdbID) {
  if (!movies[username] || !(imdbID in movies[username])) return false;
  delete movies[username][imdbID];
  saveMovies();
  return true;
}

function getGenres(username) {
  const allGenres = new Set();
  Object.values(getUserMovies(username)).forEach(movie => {
    const genres = Array.isArray(movie.Genres)
        ? movie.Genres
        : (movie.Genres ? String(movie.Genres).split(", ") : []);
    genres.forEach(g => { if (g) allGenres.add(g.trim()); });
  });
  return [...allGenres];
}

module.exports = {
  getUserMovies,
  getUserMovie,
  hasUserMovie,
  setUserMovie,
  deleteUserMovie,
  getGenres,
};