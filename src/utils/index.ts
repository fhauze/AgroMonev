export function createPageUrl(pageName: string) {
    // console.log(pageName);
    return '/' + pageName.replace(/ /g, '-');
}

// export const createPageUrl = (page) => `/${page.toLowerCase()}`;