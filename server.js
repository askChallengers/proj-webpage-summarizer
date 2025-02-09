const express = require('express');
const config = require('./config.js');
let queries = require('./queries.js');
const axios = require('axios');
const { BigQuery } = require("@google-cloud/bigquery");

const app = express();
const port = `${config.port}`;
const apikey = `${config.API_KEY}`;

app.use(express.json());

// BigQuery 클라이언트 초기화
const projectId = `${config.projectId}`; // BigQuery 데이터셋 이름
const datasetId = `${config.datasetId}`; // BigQuery 데이터셋 이름
const tableId = `${config.tableId}`; // BigQuery 테이블 이름
const keyFile = `${config.keyFile}`;
const bigquery = new BigQuery({
    keyFilename: keyFile
});

const applyConfigToQuery = (query) => {
    return query.replace(/{{projectId}}/g, projectId)
                .replace(/{{datasetId}}/g, datasetId)
                .replace(/{{tableId}}/g, tableId)
                ;
};


// 적재 데이터 조회
const getData = async () => {
    const query = applyConfigToQuery(queries.getData); // 동적으로 적용
    const [rows] = await bigquery.query(query);
    console.log("[SUCCESSED] Done getData()");
    console.log('rows:', rows);
    return rows;
};

// 요약 데이터 적재
const updateSummarizedData = async (id, summarizedText) => {
    const query = applyConfigToQuery(queries.updateSummarizedData); // 동적으로 적용
    const options = {
        query: query,
        params: { id, summarizedText }
    };

    try {
        await bigquery.query(options);
        console.log("[SUCCESSED] Done updateSummarizedData()");
        console.log(`BigQuery ID = ${id}`);
    } catch (error) {
        console.error("[FAILED] updateSummarizedData() failed:", error);
        throw new Error("BigQuery update failed");
    }
};

// 요약 생성 요청
const requestSummarizeWebPage = async (sourceUrl) => {
    const apiUrl = "https://tool.lilys.ai/summaries";
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apikey}`
    };

    const data = {
        source: {
            sourceType: "webPage",
            sourceUrl: sourceUrl
        },
        resultLanguage: "ko",
        modelType: "gpt-3.5"
    };

    console.log("Making API request with the following details:");
    console.log("URL:", apiUrl);
    console.log("Headers:", headers);
    console.log("Body:", JSON.stringify(data, null, 2));

    try {
        const response = await axios.post(apiUrl, data, { headers });
        console.log("[SUCCESSED] Done requestSummarizeWebPage()");
        return response.data;
    } catch (error) {
        console.error("[FAILED] Error details:", error.response?.data || error.message);
        throw new Error("requestSummarizeWebPage failed.");
    }
};

// 요약 결과 가져오기
const getSummarizeResult = async (requestId, resultType) => {
    const apiUrl = `https://tool.lilys.ai/summaries/${requestId}?resultType=${resultType}`;
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apikey}`
    };

    console.log("Fetching summarize result with the following details:");
    console.log("URL:", apiUrl);
    console.log("Headers:", headers);

    try {
        const response = await axios.get(apiUrl, { headers });
        console.log("[SUCCESSED] Done getSummarizeResult()");
        return response.data; // 성공적인 응답 반환
    } catch (error) {
        console.error("[FAILED] Error details:", error.response?.data || error.message);
        throw new Error("getSummarizeResult fialed"); // 에러 시 예외 발생
    }
};

// 요약 결과 상태 확인 및 대기 (개선이 필요함.)
const fetchSummarizeResultWithRetry = async (requestId, resultType, maxRetries = 5, interval = 15000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`Attempt ${attempt} to fetch summarize result...`);
        const result = await getSummarizeResult(requestId, resultType);
        console.log(`Current Result is...`+ result);

        // 처리 상태 확인
        if (result.status === 'done') {
            console.log("[SUCCESSED] Done fetchSummarizeResultWithRetry()");
            return result;
        }

        if (result.status === 'pending') {
            console.log("[PENDING] Summarization is still pending. Retrying...");
            await new Promise((resolve) => setTimeout(resolve, interval)); // 대기
        } else {
            throw new Error(`[FAILED] Unexpected status: ${result.status}`);
        }
    }

    throw new Error("[FAILED] Max retries exceeded. Summarization did not complete.");
};

// GET 요청 처리
app.get('/urlSummarizer', async (req, res) => {
    const rows = await getData();
    const id = rows[0].id;
    const sourceUrl = rows[0].naverLink;

    if (!sourceUrl || !id) {
        console.error("[FAILED] Missing query parameter.");
        return res.status(400).send({ error: "Missing query parameter." });
    }

    try {
        const creationResult = await requestSummarizeWebPage(sourceUrl); // API 호출 메서드 사용
        const requestId = creationResult.requestId; // 생성된 요약의 requestId
        const resultType = "blogPost"; // 결과 타입 설정 ("shortSummary" | "summaryNote" | "rawScript" | "timestamp" | "blogPost";)

        // 요약 결과 가져오기 호출
        const summarizeResult = await fetchSummarizeResultWithRetry(requestId, resultType);
        
        // 요약 정보 업데이트(원본 데이터 자체를 넣자. json 데이터 형태 자체를. 그래야 원본 데이터를 일단 적재 할 수 있으니까.)
        console.log(summarizeResult);
        const summaryText = JSON.stringify(summarizeResult.data.data);
        
        await updateSummarizedData(id, summaryText);

        res.status(200).send(summarizeResult);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// 서버 시작
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});