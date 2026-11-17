import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tokamboja',
    category: 'maker',
    description: 'AI Image: tokamboja',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tokamboja', ctx.prefix); }
};