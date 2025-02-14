require('dotenv').config();     // env 설정 파일 임포트

// 공통으로 사용되는 변수
const commonConfig = {
    port: 8080,
    projectId:'team-ask-infra',
    datasetId:'summarizer',
    scrapTableId:'news',
    summaryTableId: 'summary'
};

// 환경별로 다르게 설정해야 하는 변수
const devConfig = {
    keyFile: './service-account-file.json',
    API_KEY: process.env.APIKEY
};

const prodConfig = {
    keyFile: '/secrets/team-ask-visualizer-google-cloud-access-info-json'
};

// 환경 변수로 프로파일 결정 (default: 'prod')
const profile = process.env.PROFILE  || 'prod';
console.log("Current Profile : " + profile);

// 환경별 설정 적용
const environmentConfig = profile === 'dev' ? devConfig : prodConfig;

console.log("Current environmentConfig : " + environmentConfig.keyFile);

// 공통 변수와 환경별 변수를 합치기
const config = {
    ...commonConfig,
    ...environmentConfig,
};

module.exports = config;