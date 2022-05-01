import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { got } from 'got';

if (!existsSync('changelog')) {
	mkdirSync('changelog');
}

const response = await got.get('https://api.github.com/repos/zbrateam/Zebra/releases', {
		headers: {
			Accept: 'application/vnd.github.v3.raw+json'
		}
	}).json();

generateDepiction(response),
generateData(response)


function generateDepiction(response) {
	const changelog = [];

	for (const item of response) {
		changelog.push({
			name: 'HeadingView',
			properties: {
				text: item.tag_name.substring(1)
			}
		});

		changelog.push({
			name: 'TextView',
			properties: {
				content: item.body
			}
		});

		changelog.push({
			name: 'Separator'
		});
	}

	// remove trailing separator
	changelog.pop();

	const depiction = {
		$schema: './schema.json',
		tint_color: {
			light_theme: '#6680fa',
			dark_theme: '#8599ff'
		},
		children: changelog
	}

	writeFileSync('changelog/depiction.json', JSON.stringify(depiction));
}

function generateData(response) {
	const changelog = response.map(item => {
		return {
			version: item.tag_name.substring(1),
			date: item.published_at,
			body: item.body
		};
	});

	writeFileSync('changelog/data.json', JSON.stringify({ data: changelog }));
}
