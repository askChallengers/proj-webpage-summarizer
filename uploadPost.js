const express = require('express');
const config = require('./config.js');
let queries = require('./queries.js');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { BigQuery } = require("@google-cloud/bigquery");

const app = express();
const port = `${config.uPort}`;
const wpUsername = `${config.WP_USERNAME}`;
const wpPassword = `${config.WP_APP_PASSWORD}`;

app.use(express.json());

// BigQuery 클라이언트 초기화
const projectId = `${config.projectId}`; // BigQuery 데이터셋 이름
const datasetId = `${config.datasetId}`; // BigQuery 데이터셋 이름
const summaryTableId = `${config.summaryTableId}`; // BigQuery 테이블 이름
const keyFile = `${config.keyFile}`;
const bigquery = new BigQuery({
    keyFilename: keyFile
});

const applyConfigToQuery = (query) => {
    return query.replace(/{{projectId}}/g, projectId)
                .replace(/{{datasetId}}/g, datasetId)
                .replace(/{{summaryTableId}}/g, summaryTableId)
                ;
};

// 워드프레서 글 업로드
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // SSL 인증서 무시

const postToWordPress = async (title, content) => {
  try {
    const token = Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64');

    const postData = {
      title: title,
      content: content,
      status: 'publish',
    };

    const response = await axios.post(
      'https://teamask.lovestoblog.com/wp-json/wp/v2/posts', // HTTPS 사용
      postData,
      {
        headers: {
          Authorization: `Basic ${token}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) // SSL 무시 설정
      }
    );

    console.log('Post published successfully:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('Error Response:', error.response.status);
      console.error('Error Data:', error.response.data);
    } else {
      console.error('Error Message:', error.message);
    }
  }
};

// GET 요청 처리
app.get('/uploadPost', async (req, res) => {
    // try {
    //     postToWordPress('자동 포스트 제목', '이것은 자동으로 업로드된 포스트입니다.');

    //     res.status(200).send("Upload Post successed");
    // } catch (error) {
    //     res.status(500).send({ error: error.message });
    // }

    (async () => {
        const browser = await puppeteer.launch({
          headless: false,
          ignoreHTTPSErrors: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        
        const page = await browser.newPage();
      
        try {
            await page.goto('https://teamask.lovestoblog.com/wp-login.php', { waitUntil: 'networkidle2' });
            console.log('로그인 페이지 접속 성공');
        
            // 로그인
            await page.type('#user_login', wpUsername);
            await page.type('#user_pass', wpPassword);
            await page.click('#wp-submit');
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
            console.log('로그인 성공');
        
            // 새 글 작성
            await page.goto('https://teamask.lovestoblog.com/wp-admin/post-new.php', { waitUntil: 'networkidle2' });

            await page.waitForSelector('.editor-post-title__input');
            await page.type('.editor-post-title__input', '포스트 제목');


            // 본문 입력
            await page.waitForSelector('.block-editor-rich-text__editable'); // 본문 입력 필드 대기
            await page.click('.block-editor-rich-text__editable'); // 필드 클릭
            await page.keyboard.type('이 글은 Puppeteer로 작성된 자동 포스팅 내용입니다.');

            // 게시하기 클릭 (두 번 클릭 필요할 수 있음)
            await page.click('.editor-post-publish-panel__toggle'); // 게시 패널 열기
            await page.waitForSelector('.editor-post-publish-button');
            await page.click('.editor-post-publish-button'); // 게시 버튼 클릭
            await page.waitForTimeout(3000); // 게시 완료 대기

      
            console.log('포스트 작성 완료');
        } catch (error) {
            console.error('에러 발생:', error);
        } finally {
            await browser.close();
        }
      })();
});

// 서버 시작
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});