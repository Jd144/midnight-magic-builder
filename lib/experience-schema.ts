import {z} from 'zod';
const labels=z.record(z.string().max(100)).refine(v=>Object.keys(v).length<=12);
export const experienceFields={
 experience:z.enum(['universe','mystery','museum','classified','time']).optional(),
 experienceSettings:z.object({
  universe:z.object({labels:labels.optional(),orbit:z.enum(['elliptical','rings']).optional(),particles:z.boolean().optional(),unlock:z.boolean().optional()}).optional(),
  mystery:z.object({count:z.number().int().min(1).max(6).optional(),type:z.enum(['question','sequence']).optional(),puzzles:z.array(z.object({question:z.string().max(500),answer:z.string().max(500),hint:z.string().max(500)})).max(6).optional()}).optional(),
  museum:z.object({order:z.array(z.string().max(100)).max(12).refine(v=>new Set(v).size===v.length,'Exhibit order must not repeat chapters.').optional(),layout:z.enum(['salon','minimal']).optional(),transition:z.enum(['fade','slide']).optional(),audio:z.boolean().optional()}).optional(),
  classified:z.object({terminal:z.enum(['green','amber']).optional(),folders:labels.optional(),code:z.string().max(80).optional(),clues:z.boolean().optional()}).optional(),
  time:z.object({dates:z.record(z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/)).optional(),transition:z.enum(['warp','dissolve']).optional(),future:z.boolean().optional()}).optional()
 }).optional()
};
