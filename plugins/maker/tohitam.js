import { convertToImage } from '../../lib/toimage.js';
export default {
    command: ['tohitam', 'hitamkan'],
    category: 'maker',
    description: 'AI Image: tohitam',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tohitam', ctx.prefix); }
};