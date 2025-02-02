// const redis = require('redis');
// const { promisify } = require('util');

// const client = redis.createClient();
// const getAsync = promisify(client.get).bind(client);
// const setAsync = promisify(client.set).bind(client);

// beforeAll(async () => {
// 	await setAsync('key', 'value');
// });

// afterAll(() => {
// 	client.quit();
// });

// test('should get the value from Redis', async () => {
// 	const value = await getAsync('key');
// 	expect(value).toBe('value');
// });