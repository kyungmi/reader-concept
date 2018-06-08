const viewer = document.getElementById('viewer');

let containerWidth = 1000,
	containerMargin = 50,
	chapterGap = 40,
	chapter = 1,
	page = 1,
	pagesInContainer = 1,
	chapterNum = 0,
	viewMode = 'page',
	chapters = [];

const init = (mode) => {
	if (mode) {
		viewMode = mode;
	}
	if (viewMode === 'page') {
		document.body.className = 'page';
		const w = window.innerWidth;

		containerWidth = w - (containerMargin * 2);

		viewer.style.width = `${containerWidth}px`;
		[].slice.call(document.querySelectorAll('.chapter')).forEach((e) => { e.style.width = `${containerWidth}px`; });
		[].slice.call(document.querySelectorAll('.contents')).forEach((e) => {
			e.style.columnGap = `${chapterGap}px`;
			e.style.columnWidth = `${(containerWidth - (chapterGap * (pagesInContainer - 1))) / pagesInContainer}px`;
		});

		chapterNum = getChapterNum();
		gatherAllChapterInfo();
		setChapterInfo();
		setPageInfo();
		moveTo(1);

	} else {
		document.body.className = 'scroll';
		viewer.style.width = 'auto';
		[].slice.call(document.querySelectorAll('.chapter')).forEach((e) => { e.style.width = '100%'; });
		[].slice.call(document.querySelectorAll('.contents')).forEach((e) => {
			e.style.columnGap = e.style.columnWidth = 'unset';
		});

	}
};

const getChapterNum = () => document.querySelectorAll('.chapter').length;
const gatherAllChapterInfo = () => {
	let accumulatedPages = 0;
	chapters = [].slice.call(document.querySelectorAll('.contents')).map((elem, index) => {
		let pages = Math.ceil(elem.scrollWidth / (containerWidth + chapterGap ));
		const pageOffset = accumulatedPages;
		accumulatedPages += pages;
		return { pages, pageOffset, chapter: index + 1 };
	});
};
const getChapterInfo = (chapterNum) => chapters[chapterNum - 1];
const getChapterInfoByPage = (page) => chapters.find(c => page > c.pageOffset && page <= c.pageOffset + c.pages);
const getAllPageNum = () => {
	const wholeWidth = [].slice.call(document.querySelectorAll('.chapter')).reduce((w, elem) => {
		return w + elem.scrollWidth;
	}, 0);
	return Math.ceil(wholeWidth / containerWidth);
};

const setChapterInfo = () => document.getElementById('chapterInfo').innerHTML = `Chapter ${chapter} / ${chapterNum}`;
const setPageInfo = () => document.getElementById('pageInfo').innerHTML = `Page ${page * pagesInContainer} / ${getAllPageNum() * pagesInContainer}`;

const moveTo = (p) => {
	const chapterInfo = getChapterInfoByPage(p);
	if (chapterInfo) {
		page = p;
		chapter = chapterInfo.chapter;
		viewer.scrollLeft = (chapter - 1) * containerWidth;
		document.getElementById(`c${chapter}`).scrollLeft = (p - chapterInfo.pageOffset - 1) * (containerWidth + chapterGap);
		console.log(chapterInfo, page, document.getElementById(`c${chapter}`).scrollLeft);
		setChapterInfo();
		setPageInfo();
	}
};

init();
window.addEventListener('resize', () => init());

document.getElementById('cp').addEventListener('click', () => {
	const c = getChapterInfo(chapter - 1);
	if (c) {
		moveTo(c.pageOffset + 1);
	}
});
document.getElementById('cn').addEventListener('click', () => {
	const c = getChapterInfo(chapter + 1);
	if (c) {
		moveTo(c.pageOffset + 1);
	}
});
document.getElementById('pp').addEventListener('click', () => moveTo(page - 1));
document.getElementById('pn').addEventListener('click', () => moveTo(page + 1));

document.getElementById('updatePagesInContainer').addEventListener('click', () => {
	pagesInContainer = parseInt(document.getElementById('pagesInContainer').value);
	init();
});
document.getElementById('updateChapterGap').addEventListener('click', () => {
	chapterGap = parseInt(document.getElementById('chapterGap').value);
	init();
});
document.getElementById('scroll').addEventListener('click', () => init('scroll'));
document.getElementById('page').addEventListener('click', () => init('page'));
