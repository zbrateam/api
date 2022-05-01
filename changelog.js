import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { got } from 'got';

if (!existsSync('changelog')) {
	mkdirSync('changelog');
}

await generateDepiction();

async function generateDepiction() {
	const response = await got.get('https://api.github.com/repos/zbrateam/Zebra/releases', {
		headers: {
			Accept: 'application/vnd.github.v3.raw+json'
		}
	}).json();

	const changelog = [];

	for (const item of response) {
		changelog.push({
			name: 'HeadingView',
			properties: {
				text: item.name
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
