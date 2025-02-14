const queries = {
    getData: `
        SELECT * 
        FROM {{projectId}}.{{datasetId}}.{{scrapTableId}}
        WHERE regDatetime BETWEEN DATETIME(CURRENT_DATE("Asia/Seoul")) 
                      AND DATETIME(TIMESTAMP_ADD(TIMESTAMP(CURRENT_DATE("Asia/Seoul")), INTERVAL 1 DAY))
        AND \`order\` = 1;
    `,

    insertSummarizedData: `
        INSERT INTO {{projectId}}.{{datasetId}}.{{summaryTableId}}
        (newsId, requestId, summarizedContent, isSuccess)
        VALUES (@newsId, @requestId, PARSE_JSON(@summarizedContent), @isSuccess)
    `
};

module.exports = queries;