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
}

const getUrl = (listId, view, start) => {
    return `http://www.imdb.com/list/${listId}/?start=${start}&view=${view}&sort=created:desc`
};

const getDetailedData = async(listId, start = 1) => {
    const url = getUrl(listId, VIEW_DETAIL, start);
    log('REQUESTING URL', url);

    // const html = await fs.readFile('./imdb.html', 'UTF-8');
    // const $ = cheerio.load(html);

    const data = await scrape.scrapeHTML(url, {
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
        nextStart: {
            selector: '.see-more > .pages > .pagination > a',
            attr: 'href',
            convert: v => {
                if (v && v[0] === '?') {
                    v = v.substr(1);
                }
                const start = querystring.parse(v).start;
                return start ? parseInt(start) : undefined;
            }
        }
    });

    return data;
};

const getCompactData = async(listId, start = 1) => {
    const url = getUrl(listId, VIEW_COMPACT, start);

};

const run = async() => {
    let { movies, nextStart } = await getDetailedData(listId);
    log('RECEIVED DATA', movies, nextStart);
    // while(nextStart) {
    //     const data = await getDetailedData(listId, nextStart);
    //     movies = movies.concat(data.movies);
    //     nextStart = data.nextStart;

    //     log('RECEIVED DATA', movies, nextStart);
    // }

    // log('FINISHED', movies);
    
    // console.log($('.list_item > .info').first().find('div.secondary:first-of-type').length);
};

run();