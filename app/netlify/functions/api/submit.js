exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message: 'Stub submission successful' })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
