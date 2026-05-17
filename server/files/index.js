const messages = {
    dataLoadError: 'Daten konnten nicht geladen werden, Status',
    movieAlreadyInCollection: 'Film bereits in der Sammlung.',
    addMovieFailed: 'Hinzufügen des Films ist fehlgeschlagen.',
    deleteMovieFailed: 'Film konnte nicht gelöscht werden.',
    noResultsFound: 'Keine Ergebnisse gefunden.',
    searchFailed: 'Die Suche ist fehlgeschlagen...',
    loggedOutGreeting: 'Bitte logge dich ein, um deine Filmkollektion zu sehen.',
    loginFailed: 'Login fehlgeschlagen. Bitte Zugangsdaten prüfen.'
};

let currentSession = null;

function appendMovie(movie, parentEl, index, isLoggedIn) {
    const titleStr = movie.Title && movie.Title !== "N/A" ? movie.Title : "Unbekannter Titel";
    const releasedStr = movie.Released && movie.Released !== "N/A" ? movie.Released : "Unbekannt";
    const runtimeStr = movie.Runtime && movie.Runtime > 0 ? `${movie.Runtime} min` : "Unbekannt";
    const plotStr = movie.Plot && movie.Plot !== "N/A" ? movie.Plot : null;

    const genresArray = Array.isArray(movie.Genres)
        ? movie.Genres
        : (movie.Genres && movie.Genres !== "N/A" ? movie.Genres.split(", ") : []);

    const directorsStr = Array.isArray(movie.Directors)
        ? movie.Directors.join(", ")
        : (movie.Directors && movie.Directors !== "N/A" ? movie.Directors : "Unbekannt");

    const actorsStr = Array.isArray(movie.Actors)
        ? movie.Actors.join(", ")
        : (movie.Actors && movie.Actors !== "N/A" ? movie.Actors : "Unbekannt");

    const article = document.createElement("article");
    article.className = "movie-card";
    if (movie.imdbID) article.dataset.imdbId = movie.imdbID;
    article.style.animationDelay = `${index * 0.08}s`;

    if (movie.Poster && movie.Poster !== "N/A") {
        const img = document.createElement("img");
        img.className = "movie-poster";
        img.src = movie.Poster;
        img.alt = "Poster von " + titleStr;
        article.appendChild(img);
    } else {
        const placeholder = document.createElement("div");
        placeholder.className = "movie-poster";
        placeholder.style.backgroundColor = "#b2dfdb";
        placeholder.style.display = "flex";
        placeholder.style.alignItems = "center";
        placeholder.style.justifyContent = "center";
        placeholder.style.color = "#004d40";
        placeholder.textContent = "Kein Bild";
        article.appendChild(placeholder);
    }

    const info = document.createElement("div");
    info.className = "movie-info";

    const titleDiv = document.createElement("div");
    const h2 = document.createElement("h2");
    h2.textContent = titleStr;
    titleDiv.appendChild(h2);
    info.appendChild(titleDiv);

    const details = document.createElement("div");
    details.className = "movie-details";

    const pReleased = document.createElement("div");
    pReleased.className = "detail-row";
    pReleased.innerHTML = `<strong>Veröffentlicht:</strong> <span>${releasedStr}</span>`;
    details.appendChild(pReleased);

    const pRuntime = document.createElement("div");
    pRuntime.className = "detail-row";
    pRuntime.innerHTML = `<strong>Dauer:</strong> <span>${runtimeStr}</span>`;
    details.appendChild(pRuntime);

    if (genresArray.length > 0) {
        const genresWrapper = document.createElement("div");
        genresWrapper.className = "genres-wrapper";
        const genreLabel = document.createElement("strong");
        genreLabel.textContent = "Genres: ";
        genresWrapper.appendChild(genreLabel);

        genresArray.forEach(g => {
            if (g.trim()) {
                const badge = document.createElement("span");
                badge.className = "genre-badge";
                badge.textContent = g.trim();
                genresWrapper.appendChild(badge);
            }
        });
        details.appendChild(genresWrapper);
    }

    const pDir = document.createElement("div");
    pDir.className = "detail-row";
    pDir.innerHTML = `<strong>Regie:</strong> <span>${directorsStr}</span>`;
    details.appendChild(pDir);

    const pAct = document.createElement("div");
    pAct.className = "detail-row";
    pAct.innerHTML = `<strong>Darsteller:</strong> <span>${actorsStr}</span>`;
    details.appendChild(pAct);

    info.appendChild(details);

    if (plotStr) {
        const plotSection = document.createElement("section");
        const plotP = document.createElement("p");
        plotP.className = "movie-plot";
        plotP.textContent = plotStr;
        plotSection.appendChild(plotP);
        info.appendChild(plotSection);
    }

    const ratingsRow = document.createElement("aside");
    ratingsRow.className = "movie-ratings";

    const ratingsInfo = document.createElement("div");
    ratingsInfo.className = "ratings-info";

    const imdbVal = movie.imdbRating && movie.imdbRating > 0 ? movie.imdbRating : "–";
    const metaVal = movie.Metascore && movie.Metascore > 0 ? movie.Metascore : "–";

    ratingsInfo.innerHTML =
        `<p><strong>IMDb:</strong> <span>${imdbVal}</span></p>` +
        `<p><strong>Metascore:</strong> <span>${metaVal}</span></p>`;
    ratingsRow.appendChild(ratingsInfo);

    if (isLoggedIn) {
        const btnWrap = document.createElement("div");
        btnWrap.className = "card-actions";

        const editBtn = document.createElement("button");
        editBtn.className = "btn-edit";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => {
            location.href = "edit.html?imdbID=" + movie.imdbID;
        });

        const delBtn = document.createElement("button");
        delBtn.className = "btn-delete";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", () => deleteMovie(movie.imdbID));

        btnWrap.appendChild(editBtn);
        btnWrap.appendChild(delBtn);
        ratingsRow.appendChild(btnWrap);
    }

    info.appendChild(ratingsRow);
    article.appendChild(info);
    parentEl.appendChild(article);
}

function updateGenres(triggerDefault = false) {
    const genreHeader = document.querySelector('nav h2:first-of-type');
    const listElement = document.querySelector("#filter");
    listElement.innerHTML = '';

    if (!currentSession) {
        genreHeader.style.display = 'none';
        return;
    }

    fetch("/genres")
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(genres => {
            genreHeader.style.display = '';

            const allLi = document.createElement("li");
            const allBtn = document.createElement("button");
            allBtn.textContent = "All Movies";
            allBtn.className = "btn-nav";
            allBtn.onclick = () => loadMovies();
            allLi.appendChild(allBtn);
            listElement.appendChild(allLi);

            for (const genre of genres) {
                const li = document.createElement("li");
                const btn = document.createElement("button");
                btn.textContent = genre;
                btn.className = "btn-nav";
                btn.onclick = () => loadMovies(genre);
                li.appendChild(btn);
                listElement.appendChild(li);
            }

            if (triggerDefault) {
                const firstBtn = listElement.querySelector("button");
                if (firstBtn) firstBtn.click();
            }
        })
        .catch(err => {
            console.error('Failed to load genres:', err);
        });
}

function removeMovies() {
    const main = document.querySelector("main");
    while (main.firstChild) main.firstChild.remove();
}

function loadMovies(genre) {
    const url = new URL("/movies", location.href);
    if (genre) url.searchParams.set("genre", genre);

    fetch(url)
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(movies => {
            removeMovies();
            const main = document.querySelector("main");
            movies.forEach((movie, i) =>
                appendMovie(movie, main, i, Boolean(currentSession))
            );
        })
        .catch(err => {
            console.error('Failed to load movies:', err);
        });
}

function addMovie(imdbID) {
    fetch(`/movies/${imdbID}`, { method: 'PUT' })
        .then(r => {
            if (r.status === 201) {
                const resultsDiv = document.getElementById("searchResults");
                const entry = resultsDiv.querySelector(`[data-imdb-id="${imdbID}"]`);
                if (entry) entry.remove();
                loadMovies();
                updateGenres(false);
            } else if (r.status === 200) {
                alert(messages.movieAlreadyInCollection);
            } else {
                throw new Error(`HTTP ${r.status}`);
            }
        })
        .catch(err => { console.error(err); alert(messages.addMovieFailed); });
}

function deleteMovie(imdbID) {
    fetch(`/movies/${imdbID}`, { method: 'DELETE' })
        .then(r => {
            if (r.ok) {
                const card = document.querySelector(`.movie-card[data-imdb-id="${imdbID}"]`);
                if (card) {
                    card.style.transition = 'opacity 0.3s, transform 0.3s';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.9)';

                    setTimeout(() => card.remove(), 300);
                }

                updateGenres(false);

            } else {
                throw new Error(`HTTP ${r.status}`);
            }
        })
        .catch(err => {
            console.error("Fehler beim Löschen:", err);
            alert(messages.deleteMovieFailed);
        });
}

function searchMovies(query) {
    fetch(`/search?query=${encodeURIComponent(query)}`)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(results => {
            const div = document.getElementById("searchResults");
            div.innerHTML = '';
            if (results.length === 0) {
                const p = document.createElement("p");
                p.textContent = messages.noResultsFound;
                div.appendChild(p);
                return;
            }
            for (const movie of results) {
                const row = document.createElement("div");
                row.dataset.imdbId = movie.imdbID;

                const label = document.createElement("span");
                label.textContent = `${movie.Title} (${movie.Year ?? "?"})`;

                const btn = document.createElement("button");
                btn.textContent = "Add";
                btn.addEventListener("click", () => addMovie(movie.imdbID));

                row.appendChild(label);
                row.appendChild(btn);
                div.appendChild(row);
            }
        })
        .catch(err => {
            console.error(err);
            const div = document.getElementById("searchResults");
            div.innerHTML = '';
            const p = document.createElement("p");
            p.textContent = messages.searchFailed;
            div.appendChild(p);
        });
}


window.onload = function () {

    fetch("/session")
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(data => { currentSession = data || null; updateUI(); })
        .catch(() => { currentSession = null; updateUI(); });

    function renderUserGreeting() {
        const el = document.getElementById('userGreeting');
        if (currentSession) {
            const d = new Date(currentSession.loginTime);
            const dateStr = d.toLocaleDateString("de-AT", { day: "numeric", month: "long", year: "numeric" });
            const timeStr = d.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });
            el.textContent = `Hi ${currentSession.firstName} ${currentSession.lastName}, du hast dich am ${dateStr} um ${timeStr} angemeldet.`;
        } else {
            el.textContent = messages.loggedOutGreeting;
        }
    }

    function updateUI() {
        const authBtn = document.getElementById('authBtn');
        const addMoviesBtn = document.getElementById('addMoviesBtn');

        renderUserGreeting();
        updateGenres(true);

        if (currentSession) {
            authBtn.textContent = 'Logout';
            authBtn.onclick = () => {
                fetch("/logout")
                    .then(r => { if (r.ok) { currentSession = null; updateUI(); } })
                    .catch(err => console.error(err));
            };
            addMoviesBtn.style.display = 'block';
        } else {
            removeMovies();
            authBtn.textContent = 'Login';
            authBtn.onclick = () => {
                document.getElementById('loginForm').reset();
                document.getElementById('loginDialog').showModal();
            };
            addMoviesBtn.style.display = 'none';
        }
    }

    document.getElementById('loginForm').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: fd.get("username"), password: fd.get("password") })
        })
            .then(r => { if (!r.ok) { alert(messages.loginFailed); throw new Error(); } return r.json(); })
            .then(data => {
                currentSession = data;
                document.getElementById('loginDialog').close();
                updateUI();
                loadMovies();
            })
            .catch(err => console.error(err));
    });

    document.getElementById('cancelLogin').addEventListener('click', () => {
        document.getElementById('loginDialog').close();
    });


    document.getElementById('addMoviesBtn').addEventListener('click', () => {
        document.getElementById('searchForm').reset();
        document.getElementById('searchResults').innerHTML = '';
        document.getElementById('searchDialog').showModal();
    });

    document.getElementById('searchForm').addEventListener('submit', e => {
        e.preventDefault();
        searchMovies(document.getElementById('query').value);
    });

    document.getElementById('cancelSearch').addEventListener('click', () => {
        document.getElementById('searchDialog').close();
    });

    const footerToggle = document.getElementById('footerToggle');
    const pageFooter = document.getElementById('pageFooter');
    footerToggle.addEventListener('click', () => {
        pageFooter.classList.toggle('collapsed');
        footerToggle.classList.toggle('rotated');
    });
};