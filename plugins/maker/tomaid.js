import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tomaid',
    category: 'maker',
    description: 'AI Image: tomaid',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tomaid', ctx.prefix); }
};