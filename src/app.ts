import './lib/setup';
import fastify, { FastifyReply } from 'fastify';
import autoRoutes from 'fastify-autoroutes';
import rateLimit from 'fastify-rate-limit';
import path from 'path';
import logger from './lib/logger';
import { srcDir, PORT } from './lib/constants';
import { fastifyAppClosePlugin } from './lib/functions';
import { ApolloServer } from 'apollo-server-fastify';
import { ApolloServerPluginDrainHttpServer, ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { buildSchema } from 'type-graphql';
import { LyricResolver } from './resolvers/lyric.resolver';
import { RedditResolver } from './resolvers/reddit.resolver';

const bootstrap = async () => {
	const app = fastify({ ignoreTrailingSlash: true, trustProxy: true });
	app.register(autoRoutes, {
		dir: path.join(srcDir, 'routes'),
		logLevel: 'debug'
	});
	app.register(rateLimit, {
		global: true,
		max: 20,
		timeWindow: 60 * 1000
	});

	app.get('/', async (_req, reply: FastifyReply) => {
		return reply.type('text/html').send(`
		Documentation: <a href="https://docs.renzynx.space">https://docs.renzynx.space</a>
		<br/>
		<br/>
		Status Page: <a href="https://status.renzynx.space/status">https://status.renzynx.space</a>
		<br/>
		<br/>
		Graphql Playground: <a href="https://api.renzynx.space/graphql">https://api.renzynx.space/graphql</a>
		`);
	});

	const server = new ApolloServer({
		schema: await buildSchema({
			resolvers: [LyricResolver, RedditResolver],
			validate: false
		}),
		plugins: [
			fastifyAppClosePlugin(app),
			ApolloServerPluginDrainHttpServer({ httpServer: app.server }),
			ApolloServerPluginLandingPageGraphQLPlayground()
		]
	});

	await server.start();
	app.register(server.createHandler());

	app.listen(PORT, (err, address) => {
		if (err) {
			logger.error(`[app] error starting server: ${err.message}`);
			process.exit(1);
		}
		logger.success(`[app] server listening on ${address}`);
	});
};

bootstrap().catch((error: any) => {
	logger.error(`[app] error bootstrapping: ${error.message}`);
	process.exit(1);
});
