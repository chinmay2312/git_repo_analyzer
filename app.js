const octokit = require('@octokit/rest')();
const fs = require('fs');
const _ = require('lodash');
const axios = require('axios');
const parse = require('parse-diff');
const utf8 = require('utf8')

const reqData = require('./RequiredData');

// var allDataMap = new Map();
// var map = Map.prototype;

octokit.authenticate({
    type: 'token',
    token: 'f261168993b8ff10be45e863b036ac44040b678f'
})

var CONSTANTS = {
    //REPOS_DATA_FILE: './GitAnalyzer/searchData.json',
    REQUIRED_DATA_JSON: './RequiredData.json'
};

var getParams = (page_no) => {

    let q_param = "language:java license:mit";
    let sort_param = 'stars';
    let order_param = 'desc';
    let per_page_number = 2;

    return params = {
        q: q_param,
        sort: sort_param,
        order: order_param,
        page: page_no,
        per_page: per_page_number
    }
};

// Get the repositories meta data. Store it into a JSON file
async function allRepoData() {
    try {
        const result_data = await octokit.search.repos(getParams(1));
        console.log('after get repo data');
        getAllPullRequests(result_data);
    }
    catch (e) {
        console.log(e);
    }
}

//iterate over the data and store the required info from each repo metadata.
async function getAllPullRequests(repoDetails) {
    //read the file contents
    console.time('getAllPullRequests');

    const promises = repoDetails.data.items.map(getAndConvertData)
    await Promise.all(promises);

    console.log('After iterating all the elements');
    fs.writeFileSync(CONSTANTS.REQUIRED_DATA_JSON, JSON.stringify(reqData.getData(), undefined, 2));
    console.timeEnd('getAllPullRequests');
}

async function getAndConvertData(element, index) {

    let data = {
        id: element.id,
        name: element.name,
        owner: element.owner.login,
        //issues_url: _.replace(element.issues_url, '{/number}', ''),
        pulls_url: _.replace(element.pulls_url, '{/number}', ''),
        created_at: element.created_at,
        has_issues: element.has_issues
    };

    let resultant_data = await getOnlyPullRequests(data.owner, data.name);
    data['pull_requests'] = resultant_data.data;
    reqData.addData(data)
    console.log('after pull request call:' + index);
}

async function getOnlyPullRequests(data_owner, data_name) {
    try {
        let resultant_pull_requests = await octokit.pullRequests.getAll({ owner: data_owner, repo: data_name, state: 'closed' });
        console.log(typeof resultant_pull_requests.data);
        console.log(resultant_pull_requests.data.length);
        const promises = resultant_pull_requests.data.map(processEachPull);

        await Promise.all(promises);
        console.log('After each diff captured for the repo');
        return resultant_pull_requests;
    }
    catch (e) {
        console.log(e);
    }
}

async function processEachPull(eachPR) {

    try {
        // let URL= JSON.stringify(eachPR.diff_url);
        const response = await axios.get(eachPR.diff_url, {
            responseType: 'text'
        });

        eachPR['diff_data'] = parse(response.data);
        console.log('after parsing the data');
    }
    catch (e) {
        console.error(e);
    }
    return eachPR;
}

allRepoData();
console.log('Repo data collection in progress');