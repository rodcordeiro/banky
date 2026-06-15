import { TrainingSample } from '@/common/classifiers/base.classifier';

import intentSamplesData from './intent.samples.json';
import valueSamplesData from './value.samples.json';

export const intentSamples = intentSamplesData as TrainingSample[];
export const valueSamples = valueSamplesData as TrainingSample[];
