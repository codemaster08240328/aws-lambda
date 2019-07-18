const mysql = require('mysql');

const con = mysql.createConnection({
  host: process.env.RDS_HOSTNAME,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  port: process.env.RDS_PORT
});

exports.handler = (event, context, callback) => {
  
  const requestBody = JSON.parse(event.body);

  try{
    requestBody.forEach(async(item) => {
      const phrase_sql = `SELECT * FROM search_volume WHERE phrase=${item.phrase}`;
      const res = await con.query(phrase_sql)
      if (!!res) {
        const { phrase_id } = res[0] 
        await handleVolumeData(phrase_id, item)
      } else {
        await insertField(item)
      }
    })

    console.log('success')
    const response = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: `SQS event processed.`,
        input: event,
      })
    };

    callback(null, response)
  } catch(e) {
    console.log(e)
    const response = {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: e.message
      })
    };

    callback(null, response)
  } 
}

const insertField = async (item) => {
  const dt = new Date()
  const phrase_query = `INSERT INTO search_volume ('create_time', 'update_time', 'phrase') VALUES (${dt.toUTCString()}, ${dt.toUTCString()}, ${item.phrase})`
  const result = await con.query(phrase_query)
  const volume_query = `INSERT INTO search_volume_data ('phrase_id', 'create_time', 'update_time', 'source', 'marketplace', 'volume', 'volume_type', 'volume_date') VALUES (${result.id}, ${dt.toUTCString()}, ${dt.toUTCString()}, 'VL', ${item.marketplace}, ${item.volumeEstimate}, 'estimate', ${item.volumeEstimatedAt})`
  await con.query(volume_query)
  estimate_his_data = item.volumeEstimateHistorical
  estimate_his_data.forEach(async volume => {
    const est_query = `INSERT INTO search_volume_data ('phrase_id', 'create_time', 'update_time', 'source', 'marketplace', 'volume', 'volume_type', 'volume_date') VALUES (${result.id}, ${dt.toUTCString()}, ${dt.toUTCString()}, 'VL', ${item.marketplace}, ${volume.value}, 'estimate', ${volume.dateTime})`
    await con.query(est_query)
  })
  exact_his_data = item.volumeExactHistorical
  exact_his_data.forEach(async volume => {
    const ext_query = `INSERT INTO search_volume_data ('phrase_id', 'create_time', 'update_time', 'source', 'marketplace', 'volume', 'volume_type', 'volume_date') VALUES (${result.id}, ${dt.toUTCString()}, ${dt.toUTCString()}, 'VL', ${item.marketplace}, ${volume.value}, 'exact', ${volume.dateTime})`
    await con.query(ext_query)
  })
}

const handleVolumeData = async (phrase_id, item) => {
  const volume_sql = `SELECT * FROM search_volume_data WHERE phrase_id = ${phrase_id} AND volume_type = 'estimate' AND volume_date = ${item.volumeEstimatedAt} AND volume = ${item.volumeEstimate}`
  const result = await con.query(volume_sql)
  if(!!result) {
    const est_query = `UPDATE search_volume_data SET update_time=${dt.toUTCString()} WHERE id=${result.id}`
    await con.query(est_query)
  } else {
    const est_query = `INSERT INTO search_volume_data ('phrase_id', 'create_time', 'update_time', 'source', 'marketplace', 'volume', 'volume_type', 'volume_date') VALUES (${phrase_id}, ${dt.toUTCString()}, ${dt.toUTCString()}, 'VL', ${item.marketplace}, ${item.volumeEstimate}, 'estimate', ${item.volumeEstimatedAt})`
    await con.query(est_query)
  }
  estimate_his_data = item.volumeEstimateHistorical
  estimate_his_data.forEach(async volume => {
    const sql1 = `SELECT * FROM search_volume_data WHERE phrase_id = ${phrase_id} AND volume_type = 'estimate' AND volume_date = ${volume.dateTime} AND volume = ${volume.value}`
    const result2 = await con.query(sql1)
    if (!!result2) {
      const query1 = `UPDATE search_volume_data SET update_time=${dt.toUTCString()} WHERE id=${result2.id}`
      await con.query(query1)
    } else {
      const query1 = `INSERT INTO search_volume_data ('phrase_id', 'create_time', 'update_time', 'source', 'marketplace', 'volume', 'volume_type', 'volume_date') VALUES (${phrase_id}, ${dt.toUTCString()}, ${dt.toUTCString()}, 'VL', ${item.marketplace}, ${volume.value}, 'estimate', ${volume.dateTime})`
      await con.query(query1)
    }
  })

  exact_his_data = item.volumeEstimateHistorical
  exact_his_data.forEach(async volume => {
    const sql2 = `SELECT * FROM search_volume_data WHERE phrase_id = ${phrase_id} AND volume_type = 'estimate' AND volume_date = ${volume.dateTime} AND volume = ${volume.value}`
    const result3 = await con.query(sql2)
    if (!!result3) {
      const query2 = `UPDATE search_volume_data SET update_time=${dt.toUTCString()} WHERE id=${result3.id}`
      await con.query(query2)
    } else {
      const query2 = `INSERT INTO search_volume_data ('phrase_id', 'create_time', 'update_time', 'source', 'marketplace', 'volume', 'volume_type', 'volume_date') VALUES (${phrase_id}, ${dt.toUTCString()}, ${dt.toUTCString()}, 'VL', ${item.marketplace}, ${volume.value}, 'estimate', ${volume.dateTime})`
      await con.query(query2)
    }
  })
}

