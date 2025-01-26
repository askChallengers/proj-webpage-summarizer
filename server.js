const express = require('express');
const axios = require('axios');
const config = require('./config.js');

const app = express();
const port = `${config.port}`;
const apikey = `${config.apikey}`;

app.use(express.json());

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
        console.log(response.data);
        return response.data; // 성공적인 응답 반환
    } catch (error) {
        console.error("Error details:", error.response?.data || error.message);
        throw new Error("Failed to summarize the web page."); // 에러 시 예외 발생
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
        console.log(response.data);
        return response.data; // 성공적인 응답 반환
    } catch (error) {
        console.error("Error details:", error.response?.data || error.message);
        throw new Error("Failed to fetch summarize result."); // 에러 시 예외 발생
    }
};

// 요약 결과 상태 확인 및 대기
const fetchSummarizeResultWithRetry = async (requestId, resultType, maxRetries = 5, interval = 15000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`Attempt ${attempt} to fetch summarize result...`);
        const result = await getSummarizeResult(requestId, resultType);
        console.log(`Current Result is...`+ result);

        // 처리 상태 확인
        if (result.status === 'done') {
            console.log("Summarization completed successfully.");
            return result; // 성공적인 결과 반환
        }

        if (result.status === 'pending') {
            console.log("Summarization is still pending. Retrying...");
            await new Promise((resolve) => setTimeout(resolve, interval)); // 대기
        } else {
            throw new Error(`Unexpected status: ${result.status}`);
        }
    }

    throw new Error("Max retries exceeded. Summarization did not complete.");
};

// GET 요청 처리
app.get('/urlSummerizer', async (req, res) => {
    // const { sourceUrl } = req.query;
    const sourceUrl = "https://n.news.naver.com/article/262/0000018094?cds=news_media_pc&type=editn";

    if (!sourceUrl) {
        return res.status(400).send({ error: "Missing 'sourceUrl' in query parameter." });
    }

    try {
        const creationResult = await requestSummarizeWebPage(sourceUrl); // API 호출 메서드 사용
        const requestId = creationResult.requestId; // 생성된 요약의 requestId
        const resultType = "blogPost"; // 결과 타입 설정 ("shortSummary" | "summaryNote" | "rawScript" | "timestamp" | "blogPost";)

        // 요약 결과 가져오기 호출
        const summarizeResult = await fetchSummarizeResultWithRetry(requestId, resultType);
        res.status(200).send(summarizeResult);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// 서버 시작
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});