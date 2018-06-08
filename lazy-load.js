const viewer = document.getElementById('viewer');
const loading = document.getElementById('loading');

let containerWidth = 1000,
	containerMargin = 50,
	chapterGap = 40,
	chapter = 1,
	offset = 1,
	offsetRatioInChapter = 0.0,
	pagesInContainer = 1,
	chapterNum = 50,
	viewMode = 'page',
	chapters = {},
	firstChapter = 1,
	lastChapter = 1,
	isLoading = false;


const restorePosition = () => {
	const c = getChapterInfo(chapter);
	moveTo(Math.round((offsetRatioInChapter * (viewMode === 'page' ? c.pages : c.height)) + c.offset));
};
const setOffset = (_offset) => {
	offset = _offset;
	const c = getChapterInfo(chapter);
	offsetRatioInChapter = (offset - c.offset) / (viewMode === 'page' ? c.pages : c.height);
};

const createChapterElement = num => {
	const chapterElem = document.createElement('div');
	chapterElem.className = 'chapter';
	chapterElem.id = `c${num}`;
	return chapterElem;
};

const loadChapter = (num) => {
	const n = Math.floor(Math.random() * 4) + 1;
	const uri = `./contents/${n}.html`;
	const title = `Title ${num}`;

	if (chapters[num]) {
		return chapters[num];
	}
	return fetch(uri).then(response => response.text()).then(contents => {
		const chapterElem = createChapterElement(num);
		chapterElem.innerHTML = `<div class="contents"><h1>${title}</h1>${contents}</div>`;

		chapters[num] = {
			chapter: num,
			uri,
			title,
			element: chapterElem
		};

		return chapters[num];
	});
};

const setIsLoading = (progress, max) => {
	isLoading = Number.isInteger(progress);
	if (isLoading) {
		loading.innerHTML = `Loading... ${Math.ceil((progress / (max ? max : chapterNum))  * 100)}%`;
	}
	loading.style.display = isLoading ? 'block' : 'none';
};

const setStyle = () => {
	let style = document.getElementById('override-style');
	if (!style) {
		style = document.createElement('style');
		style.id = 'override-style';
		document.head.appendChild(style);
	}

	if (viewMode === 'page') {
		document.body.className = 'page';
		const w = window.innerWidth;

		containerWidth = w - (containerMargin * 2);

		style.innerHTML = `
			.page .viewer { width: ${containerWidth}px; }
			.page .chapter { width: ${containerWidth}px; }
			.page .contents { column-gap: ${chapterGap}px; column-width: ${(containerWidth - (chapterGap * (pagesInContainer - 1))) / pagesInContainer}px; }
		`;
	} else {
		document.body.className = '';

		style.innerHTML = `
			.viewer { width: auto; }
			.chapter { width: 100%; }
			.contents { column-gap: unset; column-width: unset; }
		`;
	}
};

const renderChapters = async (startChap, endChap, withCalc = false) => {
	const viewerFrag = document.createDocumentFragment();
	const progressMax = withCalc ? chapterNum + (endChap - startChap + 1) : chapterNum;
	let progressedChap = 0;
	setIsLoading(progressedChap, progressMax);

	firstChapter = startChap = Math.max(1, startChap);
	lastChapter = endChap = Math.min(chapterNum, endChap);

	// [startChap, endChap]
	for (let i = startChap; i < endChap + 1; i++) {
		const chapterInfo = await loadChapter(i);

		viewerFrag.appendChild(chapterInfo.element);

		progressedChap += 1;
		setIsLoading(progressedChap, progressMax);
	}

	if (withCalc) {
		viewerFrag.appendChild(createChapterElement('last'));
	}
	
	// append chapters
	const newViewer = viewer.cloneNode();
	newViewer.appendChild(viewerFrag);
	viewer.innerHTML = newViewer.innerHTML;

	if (withCalc) {
		const calcDiv = document.getElementById('clast');
		let offset = 0;
		for (let i = 1; i < chapterNum + 1; i++) {
			const chapterInfo = await loadChapter(i);
			const chapterElem = chapterInfo.element;

			calcDiv.innerHTML = chapterElem.innerHTML;

			if (viewMode === 'page') {
				const pages = Math.ceil(calcDiv.scrollWidth / (containerWidth + chapterGap));
				chapters[i].pages = pages;
			} else {
				chapters[i].height = calcDiv.scrollHeight;
			}

			chapterInfo.offset = offset;
			offset += viewMode === 'page' ? chapterInfo.pages : chapterInfo.height;

			progressedChap += 1;
			setIsLoading(progressedChap, progressMax);
		}
		calcDiv.innerHTML = '';
	}

	setIsLoading(false);
};

const init = async (mode) => {
	
	if (mode) {
		viewMode = mode;
	}

	setStyle();
	await renderChapters(firstChapter, lastChapter, true);
	
	setChapterInfo();
	setPageInfo();
	restorePosition();
};


const getChapterInfo = (chapterNum) => chapters[chapterNum];
const getChapterInfoByOffset = (offset) => Object.values(chapters).find(c => offset > c.offset && offset <= c.offset + (viewMode === 'page' ? c.pages : c.height));

const setChapterInfo = () => document.getElementById('chapterInfo').innerHTML = `Chapter ${chapter} / ${chapterNum}`;
const setPageInfo = () => {
	document.getElementById('pageInfo').innerHTML = `
		Position ${offset * pagesInContainer} (${(offsetRatioInChapter * 100).toFixed(2)}%)
		/ ${(chapters[chapterNum - 1].offset + chapters[chapterNum - 1].pages) * pagesInContainer}
	`;
};
const getChapterElem = (num) => document.getElementById(`c${num}`);
const moveTo = async (_offset) => {
	const chapterInfo = getChapterInfoByOffset(_offset);
	if (chapterInfo) {
		if (chapter !== chapterInfo.chapter) {
			chapter = chapterInfo.chapter;
			await renderChapters(chapter - 1, chapter + 1);
		}
		setOffset(_offset);
		if (viewMode === 'page') {
			viewer.scrollLeft = (chapter - firstChapter) * containerWidth;
			getChapterElem(chapter).scrollLeft = (offset - chapterInfo.offset - 1) * (containerWidth + chapterGap);
		} else {
			// TODO hmm...
			document.scrollingElement.scrollTop = offset - getChapterInfo(firstChapter).offset;
		}
		
		setChapterInfo();
		setPageInfo();
	}
};

init();
window.addEventListener('resize', () => init());

document.getElementById('cp').addEventListener('click', () => {
	const c = getChapterInfo(chapter - 1);
	if (c) {
		moveTo(c.offset + 1);
	}
});
document.getElementById('cn').addEventListener('click', () => {
	const c = getChapterInfo(chapter + 1);
	if (c) {
		moveTo(c.offset + 1);
	}
});
document.getElementById('pp').addEventListener('click', () => moveTo(offset - 1));
document.getElementById('pn').addEventListener('click', () => moveTo(offset + 1));

document.getElementById('updateColumn').addEventListener('click', () => {
	pagesInContainer = parseInt(document.getElementById('pagesInContainer').value);
	chapterGap = parseInt(document.getElementById('chapterGap').value);
	init();
});
document.getElementById('scroll').addEventListener('click', () => init('scroll'));
document.getElementById('page').addEventListener('click', () => init('page'));

window.addEventListener('scroll', () => {
	if (viewMode === 'page') return;

	const currentY = document.scrollingElement.scrollTop;
	const currentOffset = currentY + getChapterInfo(firstChapter).offset + window.innerHeight;
	const currentChapter = getChapterInfoByOffset(currentOffset);
	
	if (!currentChapter) return;
	
	if (currentY < 100) {
		const c = getChapterInfo(chapter - 1);
		if (c) {
			console.log('moveTo:' + c.offset + c.height - document.scrollingElement.scrollHeight);
			moveTo(c.offset + c.height - document.scrollingElement.scrollHeight + 1);
		}
	} else if (currentY + window.innerHeight > document.scrollingElement.scrollHeight - 100) {
		const c = getChapterInfo(chapter + 1);
		if (c) {
			console.log('moveTo:' + c.offset);
			moveTo(c.offset + 1);
		}
	} else {
		moveTo(currentOffset - window.innerHeight);
	}

});
