import { z } from 'zod';

const dateSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    return new Date(value);
  }
}, z.date());

export enum EnergyType {
  Solar = 'solar',
  Biomass = 'biomass',
  Wind = 'wind',
  Thermal = 'thermal',
  Hydro = 'hydro',
  Geothermal = 'geothermal',
}

export const intervalDTOSchema = z.object({
  start: dateSchema,
  end: dateSchema,
}).strict();

export class IntervalDTO implements z.infer<typeof intervalDTOSchema> {
  start!: Date;

  end!: Date;
}

export const meterDataSchema = z.object({
  assetId: z.string().min(1),
  meterId: z.string().min(1),
  siteId: z.string().min(1),
  regionId: z.string().min(1),
  countryId: z.string().min(1),
  assetName: z.string().min(1).optional(),
}).strict();

class MeterData implements z.infer<typeof meterDataSchema> {
  assetId!: string;

  meterId!: string;

  siteId!: string;

  regionId!: string;

  countryId!: string;

  assetName?: string;
}

const consumptionDTOSchema = meterDataSchema.extend({
  volume: z.number().gte(0)
}).strict();

export class ConsumptionDTO extends MeterData implements z.infer<typeof consumptionDTOSchema> {
  volume!: number;
}

const generationDTOSchema = meterDataSchema.extend({
  volume: z.number().gte(0),
  energyType: z.nativeEnum(EnergyType),
}).strict();

export class GenerationDTO extends MeterData implements z.infer<typeof generationDTOSchema> {
  volume!: number;

  energyType!: EnergyType;
}

const batteryDTOSchema = meterDataSchema.extend({
  volume: z.number(),
  soc: z.number().gte(0),
}).strict();

export class BatteryDTO extends MeterData implements z.infer<typeof batteryDTOSchema> {
  volume!: number;

  soc!: number;
}

const preferenceDTOSchema = z.object({
  matchRegionally: z.boolean(),
  matchNationally: z.boolean(),
  matchInternationally: z.boolean(),
  energySourcePriority: z.record(z.nativeEnum(EnergyType), z.number())
}).strict();

export class PreferenceDTO implements z.infer<typeof preferenceDTOSchema> {
  matchRegionally!: boolean;

  matchNationally!: boolean;

  matchInternationally!: boolean;

  energySourcePriority!: Partial<Record<EnergyType, number>>;
}

export type CountryId = string;
export type RegionId = string;
export type SiteId = string;

const carbonIntensitiesSchema = z.object({
  carbonIntensity: z.number().min(0),
  regions: z.record(z.string().min(1), z.number()),
  sites: z.record(z.string().min(1), z.number()),
}).strict();

export class CarbonIntensities implements z.infer<typeof carbonIntensitiesSchema> {
  carbonIntensity!: number;

  regions!: Record<RegionId, number>

  sites!: Record<SiteId, number>
}

const gridRenewablePercentagesSchema = z.object({
  renewablePercentage: z.number().min(0).max(1),
  regions: z.record(z.string().min(1), z.number()),
  sites: z.record(z.string().min(1), z.number()),
}).strict();

export class GridRenewablePercentages implements z.infer<typeof gridRenewablePercentagesSchema> {
  renewablePercentage!: number;

  regions!: Record<RegionId, number>

  sites!: Record<SiteId, number>
}

export const inputDTOSchema = z.object({
  timestamp: intervalDTOSchema,
  consumptions: consumptionDTOSchema.array(),
  generations: generationDTOSchema.array(),
  batteries: batteryDTOSchema.array(),
  preferences: z.record(z.string().min(1), preferenceDTOSchema),
  carbonIntensities: z.record(z.string().min(1), carbonIntensitiesSchema),
  gridRenewablePercentage: z.record(z.string().min(1), gridRenewablePercentagesSchema),
}).strict();

export class InputDTO implements z.infer<typeof inputDTOSchema> {
  timestamp!: IntervalDTO;

  consumptions!: ConsumptionDTO[];

  generations!: GenerationDTO[];

  batteries!: BatteryDTO[];

  preferences!: Record<string, PreferenceDTO>;

  carbonIntensities!: Record<CountryId, CarbonIntensities>;

  gridRenewablePercentage!: Record<CountryId, GridRenewablePercentages>;
}

