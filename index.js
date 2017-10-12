const pify = require('pify');
const request = pify(require('request'));
const fs = pify(require('fs'));
const querystring = require('querystring');
const scrape = require('scrape-it');
const cheerio = require('cheerio');

const VIEW_COMPACT = 'compact';
const VIEW_DETAIL = 'detail';

const log = (...args) => {
    console.log('');
    console.log('---');
    console.log('');
    args.forEach(arg => console.log(arg));
    console.log('');
};

const logResponseData = (data) => {
    const {
        movies,
        nextStart
    } = data;
    log(`RECEIVED ${movies.length} MOVIES, from "${movies[0].name}" to "${movies[movies.length - 1].name}", NEXT START: ${nextStart}`);
}

const getUrl = (listId, view, start) => {
    return `http://www.imdb.com/list/${listId}/?start=${start}&view=${view}&sort=created:desc`
};

const nextStartConfig = {
    selector: '.see-more > .pages > .pagination > a',
    // attr: 'href',
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

const getDetailedData = async(listId, start = 1) => {
    const url = getUrl(listId, VIEW_DETAIL, start);
    log('REQUESTING URL', url);

    // const html = await fs.readFile('./imdb_detailed1.html', 'UTF-8');
    // const $ = cheerio.load(html);
    // const data = await scrape.scrapeHTML($, {

    const data = await scrape(url, {
        movies: {
            listItem: '.list_item > .info',
            data: {
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

    // logResponseData(data);

    const movies = {};
    data.movies.forEach(movie => movies[movie.name] = movie);
    return {
        movies,
        nextStart: data.nextStart
    };
};

const getCompactData = async(listId, start = 1) => {
    const url = getUrl(listId, VIEW_COMPACT, start);
    log('REQUESTING URL', url);

    const html = await fs.readFile('./imdb_compact1.html', 'UTF-8');
    const $ = cheerio.load(html);
    const data = await scrape.scrapeHTML($, {

    // const data = await scrape(url, {
        movies: {
            listItem: '.list_item',
            data: {
                name: '.title > a',
                created: 'td.created'
            }
        },
        nextStart: nextStartConfig
    });

    log(data);
    process.exit();

};

const run = async() => {
    const listId = process.argv[2];
    if (!listId) {
        throw new Error('Invalid or missing listId');
    }

    // let {movies,nextStart} = await getDetailedData(listId);

    // while (nextStart) {
    //     const data = await getDetailedData(listId, nextStart);
    //     movies = Object.assign({}, movies, data.movies);
    //     nextStart = data.nextStart;
    // }

    let {compactMovies,nextStart} = await getCompactData(listId);
    console.log(compactMovies);




    // log('FINISHED', movies, `Total movies ${Object.keys(movies).length}`);
};

run();