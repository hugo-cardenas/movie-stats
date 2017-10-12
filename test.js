const webtask = require('./index');

const listId = process.argv[2];
if (!listId) {
    console.log('');
    console.log(`Usage: node ${process.argv[1].split('/').pop()} <list id>`)
    console.log('');
    process.exit(1);
}

const context = {
    query: {
        listId
    }
};

const callback = (error, result) => {
    if (error) {
        console.error(error);
    } else {
        console.log(result);
    }
};

webtask(context, callback);
