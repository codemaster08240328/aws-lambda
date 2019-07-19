const mysql = require('mysql2/promise');

exports.handler = async (event) => {

  const con = await mysql.createConnection({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASS,
    port: process.env.MYSQLPORT,
    database: process.env.MYSQLDATABASE
  });


  //context.callbackWaitsForEmptyEventLoop = false;

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'SQS event processed.',
      input: event,
    }),
  };
  var body = event.Records[0].body;

  const requestBody = JSON.parse(body.replace(/\\/g, ""));

  //const requestBody = event

  try {
    for (let i = 0; i < requestBody.length; i++) {
      let item = requestBody[i]
      const phrase_sql = `SELECT * FROM search_volume WHERE phrase='${item.phrase}'`;
      const [rows, fields] = await con.execute(phrase_sql)

      if (!!rows.length) {
        const { phrase_id } = rows[0]
        await handleVolumeData(phrase_id, item, con)
      } else {
        await insertField(item, con)
      }
    }

    return JSON.stringify({
      statusCode: 200,
      message: 'success'
    })
  } catch (e) {
    console.log(e)

    return JSON.stringify({
      statusCode: 500,
      message: 'Server error'
    })
  }
}

const insertField = async (item, con) => {
  const phrase_query = `INSERT INTO search_volume(create_time, update_time, phrase) VALUES (now(), now(), '${item.phrase}')`
  const [row, field] = await con.execute(phrase_query)
  const volume_query = `INSERT INTO search_volume_data (phrase_id, create_time, update_time, source, marketplace, volume, volume_type, volume_date) VALUES (${row.id}, now(), now(), 'VL', '${item.marketplace}', ${item.volumeEstimate}, 'estimate', '${item.volumeEstimatedAt}')`
  await con.execute(volume_query)
  const estimate_his_data = item.volumeEstimateHistorical
  for (let i = 0; i < estimate_his_data.length; i++) {
    let volume = estimate_his_data[i]
    const est_query = `INSERT INTO search_volume_data (phrase_id, create_time, update_time, source, marketplace, volume, volume_type, volume_date) VALUES (${row.id}, now(), now(), 'VL', '${item.marketplace}', ${volume.value}, 'estimate', '${volume.dateTime}')`
    await con.execute(est_query)
  }

  const exact_his_data = item.volumeExactHistorical
  for (let i = 0; i < exact_his_data.length; i++) {
    let volume = exact_his_data[i]
    const ext_query = `INSERT INTO search_volume_data (phrase_id, create_time, update_time, source, marketplace, volume, volume_type, volume_date) VALUES (${row.id}, now(), now(), 'VL', '${item.marketplace}', ${volume.value}, 'exact', '${volume.dateTime}')`
    await con.execute(ext_query)
  }
}

const handleVolumeData = async (phrase_id, item, con) => {
  const volume_sql = `SELECT * FROM search_volume_data WHERE phrase_id = ${phrase_id} AND volume_type = 'estimate' AND volume_date = '${item.volumeEstimatedAt}' AND volume = ${item.volumeEstimate}`
  const [rows, fields] = await con.execute(volume_sql)
  if (!!rows.length) {
    const est_query = `UPDATE search_volume_data SET update_time=now() WHERE id=${rows[0].id}`
    await con.execute(est_query)
  } else {
    const est_query = `INSERT INTO search_volume_data (phrase_id, create_time, update_time, source, marketplace, volume, volume_type, volume_date) VALUES (${phrase_id}, now(), now(), 'VL', '${item.marketplace}', ${item.volumeEstimate}, 'estimate', '${item.volumeEstimatedAt}')`
    await con.execute(est_query)
  }

  const estimate_his_data = item.volumeEstimateHistorical
  for (let i = 0; i < estimate_his_data.length; i++) {
    let volume = estimate_his_data[i]
    const sql1 = `SELECT * FROM search_volume_data WHERE phrase_id = ${phrase_id} AND volume_type = 'estimate' AND volume_date = '${volume.dateTime}' AND volume = ${volume.value}`
    const [rows, fields] = await con.execute(sql1)
    if (!!rows.length) {
      const query1 = `UPDATE search_volume_data SET update_time=now() WHERE id=${rows[0].id}`
      await con.execute(query1)
    } else {
      const query1 = `INSERT INTO search_volume_data (phrase_id, create_time, update_time, source, marketplace, volume, volume_type, volume_date) VALUES (${phrase_id}, now(), now(), 'VL', '${item.marketplace}', ${volume.value}, 'estimate', '${volume.dateTime}')`
      await con.execute(query1)
    }
  }

  const exact_his_data = item.volumeEstimateHistorical
  for (let i = 0; i < exact_his_data.length; i++) {
    let volume = exact_his_data[i]
    const sql2 = `SELECT * FROM search_volume_data WHERE phrase_id = ${phrase_id} AND volume_type = 'estimate' AND volume_date = '${volume.dateTime}' AND volume = ${volume.value}`
    const [rows, fields] = await con.execute(sql2)
    if (!!rows.length) {
      const query2 = `UPDATE search_volume_data SET update_time=now() WHERE id=${rows[0].id}`
      await con.execute(query2)
    } else {
      const query2 = `INSERT INTO search_volume_data (phrase_id, create_time, update_time, source, marketplace, volume, volume_type, volume_date) VALUES (${phrase_id}, now(), now(), 'VL', '${item.marketplace}', ${volume.value}, 'estimate', '${volume.dateTime}')`
      await con.execute(query2)
    }
  }
}