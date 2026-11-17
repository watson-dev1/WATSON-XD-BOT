import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'toliquor',
    category: 'maker',
    description: 'AI Image: toliquor',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'toliquor', ctx.prefix); }
};