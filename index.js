"use latest";

const querystring = require('querystring');
const scrape = require('scrape-it');
const chrono = require('chrono-node');

const VIEW_COMPACT = 'compact';
const VIEW_DETAIL = 'detail';

const log = (...args) => {
    if (process.env.LOG_ENABLED === '1') {
        console.log('---');
        console.log('');
        args.forEach(arg => console.log(arg));
        console.log('');
    }
};

const getUrl = (listId, view, start) => {
    return `http://www.imdb.com/list/${listId}/?start=${start}&view=${view}&sort=created:asc`
};

const nextStartConfig = {
    selector: '.see-more > .pages > .pagination > a',
    how: elem => {
        if (elem.text().includes('Next'))  {
            const href = elem.attr('href');
            if (href && href[0] === '?') {
                const start = querystring.parse(href.substr(1)).start;
                return start ? parseInt(start) : undefined;
            }
        }
        return undefined;
    }
};

const indexMoviesByName = movies => {
    const indexedMovies = {};
    movies.forEach(movie => indexedMovies[movie.name] = movie);
    return indexedMovies;
};

const getDetailPageData = async(listId, start = 1) => {
    const url = getUrl(listId, VIEW_DETAIL, start);
    log('REQUESTING URL', url);

    const data = await scrape(url, {
        error: '.error_code_404',
        movies: {
            listItem: '.list_item > .info',
            data: {
                id: {
                    selector: 'b > a',
                    attr: 'href',
                    convert: val => {
                        const matches = val.match(/\/title\/(.+)\//);
                        if (matches && matches[1]) {
                            return matches[1];
                        }
                        return undefined;
                    }
                },
                name: 'b > a',
                director: {
                    selector: 'div.secondary > a',
                    eq: 0
                },
                actors: {
                    selector: 'div.secondary',
                    eq: 1,
                    convert: val => val.replace('Stars: ', '').split(', ')
                }
            }
        },
        nextStart: nextStartConfig
    });

    log('RECEIVED DATA', data);

    if (data.error) {
        throw new Error(`The specified list with id "${listId}" was not found or is not public`);
    }

    return data;
};

const getCompactPageData = async(listId, start = 1) => {
    const url = getUrl(listId, VIEW_COMPACT, start);
    log('REQUESTING URL', url);

    const data = await scrape(url, {
        movies: {
            listItem: '.list_item.odd, .list_item.even',
            data: {
                name: '.title > a',
                createdAt: {
                    selector: 'td.created',
                    convert: val => Math.floor(chrono.parseDate(val).getTime() / 1000)
                },
                userRating: 'td.user_rating',
                year: 'td.year'
            }
        },
        nextStart: nextStartConfig
    });

    log('RECEIVED DATA', data);

    return data;
};

const getMovieDataWithPagination = async(listId, requestFunction) => {
    let { movies, nextStart } = await requestFunction(listId);
    while (nextStart) {
        const data = await requestFunction(listId, nextStart);
        movies = movies.concat(data.movies);
        nextStart = data.nextStart;
    }
    movies = movies.map((movie, i) => Object.assign({}, movie, { timelineIndex: i }));
    return indexMoviesByName(movies);
};

const getDetailMovies = async(listId) => {
    return getMovieDataWithPagination(listId, getDetailPageData);
};

const getCompactMovies = async(listId) => {
    return getMovieDataWithPagination(listId, getCompactPageData);
};

const getMovies = async(listId) => {
    const detailMovies = await getDetailMovies(listId);
    const compactMovies = await getCompactMovies(listId);

    Object.keys(compactMovies).forEach(name => {
        if (detailMovies[name]) {
            detailMovies[name] = Object.assign({}, detailMovies[name], compactMovies[name]);
        }
    });

    return Object.keys(detailMovies).map(key => detailMovies[key]);
};

module.exports = (context, callback) => {
    const listId = context.query.listId;
    if (!listId) {
        callback(new Error('Missing query parameter: listId'));
    }

    getMovies(listId)
        .then(movies => callback(null, movies))
        .catch(error => callback(error));
};
