import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tomirror',
    category: 'maker',
    description: 'AI Image: tomirror',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tomirror', ctx.prefix); }
};