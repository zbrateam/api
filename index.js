import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { got } from 'got';

const FREE_PAID_REGEX = /\[\s*(free|paid)\s*\]/i;

const url = new URL('https://www.reddit.com/r/jailbreak/search.json');

url.searchParams.append('q', 'subreddit:jailbreak (flair:Release OR flair:Update OR flair:Upcoming OR flair:News)');
url.searchParams.append('restrict_sr', 'on');
url.searchParams.append('sort', 'relevance');
url.searchParams.append('t', 'month');

const response = await got.get(url).json();

const posts = [];

for (const { data } of response.data.children) {

	validatePost(data);

	const thumbnail = getThumbnail(data);

	const title = cleanupTitle(data.title);

	const tags = createTags(data.title, data.link_flair_css_class);

	posts.push({
		title: title,
		url: data.url,
		thumbnail: thumbnail,
		tags: tags,
		created: data.created_utc
	});
}

if (posts.length === 0) throw new Error('No reddit news available. Houston we have a problem. Like seriously this is not good.');


posts.sort((a, b) => a.created > b.created);
posts.forEach(post => delete post.created);

writeToFile(posts);


function validatePost(post) {
	if (!post.url || post.url.length === 0 || !(new URL(post.url))) {
		throw new Error('Post URL missing, did they change the JSON?');
	}

	if (!post.link_flair_css_class || post.link_flair_css_class.length === 0) {
		throw new Error('Post flair missing, did they change the JSON?');
	}

	if (!post.title || post.title.length === 0) {
		throw new Error('Post title missing, did they change the JSON?');
	}
}

function getThumbnail(post) {
	let thumbnail;
	if (post.thumbnail && post.thumbnail != 'nsfw') {
		if (post.preview?.images[0]?.source) {
			thumbnail = post.preview.images[0].source.url;
		}
		else if (post.media_metadata) {
			const entries = Object.values(post.media_metadata);
			for (const entry of entries) {
				if (entry.e === 'Image' && entry.s?.u) {
					thumbnail = entry.s.u;
				}
			}
		} else {
			try {
				// check that it is a valid URL
				new URL(post.thumbnail);
				thumbnail = post.thumbnail;
			} catch { }
		}
	}

	return thumbnail ?? null;
}

function cleanupTitle(title) {
	let cleaned = title.trim();

	let i = 0;
	while (cleaned.startsWith('[') && i < 5) {
		cleaned = cleaned
			.substring(cleaned.indexOf(']') + 1)
			.trimStart();
		i++;
	}

	return cleaned;
}

function createTags(title, postTag) {
	const match = title.match(FREE_PAID_REGEX);

	return match ? `${postTag},${match[1].toLowerCase()}` : postTag;
}

function writeToFile(posts) {
	if (!existsSync('./docs')) {
		mkdirSync('./docs');
	}

	writeFileSync('docs/reddit-news.json', JSON.stringify({
		data: posts
	}));
}
