const queries = {
    getData: `
        SELECT * 
        FROM {{projectId}}.{{datasetId}}.{{tableId}}
        WHERE regDatetime BETWEEN DATETIME(CURRENT_DATE(), "Asia/Seoul") 
                      AND DATETIME(TIMESTAMP_ADD(TIMESTAMP(CURRENT_DATE(), "Asia/Seoul"), INTERVAL 1 DAY))
        AND \`order\` = 1;
    `,

    updateSummarizedData: `
        UPDATE {{projectId}}.{{datasetId}}.{{tableId}}
        SET 
            summarizedText = @summarizedText,
            isSummarized = 'Y',
            summarizedDate = CURRENT_DATETIME("Asia/Seoul")
        WHERE id = @id;
    `
};

module.exports = queries;
