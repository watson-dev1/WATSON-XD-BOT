import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tojepang',
    category: 'maker',
    description: 'AI Image: tojepang',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tojepang', ctx.prefix); }
};