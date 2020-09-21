import { Requester, Validator } from '@chainlink/external-adapter';
import axios from 'axios';

// Define custom parameters to be used by the adapter.
// Extra parameters can be stated in the extra object,
// with a Boolean value indicating whether or not they
// should be required.
const customParams = {
  base: ['base', 'from', 'coin'],
  quote: ['quote', 'to', 'market'],
  endpoint: false
}

const createRequest = (input, callback) => {
  // The Validator helps you validate the Chainlink request data
  const validator = new Validator(callback, input, customParams)
  const jobRunID = validator.validated.id
  const endpoint = validator.validated.data.endpoint || 'price'
  const url = `https://min-api.cryptocompare.com/data/${endpoint}`
  const fsym = validator.validated.data.base.toUpperCase()
  const tsyms = validator.validated.data.quote.toUpperCase()

  const params = {
    fsym,
    tsyms
  };

  try {
    // It's common practice to store the desired value at the top-level
    // result key. This allows different adapters to be compatible with
    // one another.
    const response = await axios.get(url, params);
    response.data.result = Requester.validateResultNumber(response.data, [tsyms])

    callback(response.status, Requester.success(jobRunID, response))
  } catch (error) {
    callback(500, Requester.errored(jobRunID, error));
  }
}

// lambda handler
export const handler = async (event, context, callback) => {
  // https://stackoverflow.com/questions/37791258/lambda-timing-out-after-calling-callback?rq=1
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    createRequest(JSON.parse(event.body), (statusCode, data) => {
      callback(null, {
        statusCode: statusCode,
        body: JSON.stringify(data),
        isBase64Encoded: false
      });
    });
  } catch(error) {
    console.log(error);

    callback(500);
  }
};
