export interface HapAccessoriesRespType {
  accessories: Array<{
    aid: number;
    services: Array<{
      iid: number;
      type: string;
      primary: boolean;
      hidden: boolean;
      linked?: Array<number>;
      characteristics: Array<{
        iid: number;
        type: string;
        description: string;
        value: number | string | boolean;
        format: 'bool' | 'int' | 'float' | 'string' | 'uint8' | 'uint16' | 'uint32' | 'uint64' | 'data' | 'tlv8' | 'array' | 'dictionary';
        perms: Array<'pr' | 'pw' | 'ev' | 'aa' | 'tw' | 'hd'>;
        unit?: 'unit' | 'percentage' | 'celsius' | 'arcdegrees' | 'lux' | 'seconds';
        maxValue?: number;
        minValue?: number;
        minStep?: number;
      }>;
    }>;
  }>;
}

export interface ServiceType {
  aid: number;
  iid: number;
  uuid: string;
  type: string;
  linked?: Array<number>;
  linkedServices?: {
    [iid: number]: ServiceType;
  };
  hidden?: boolean;
  humanType: string;
  serviceName: string;
  serviceCharacteristics: CharacteristicType[];
  accessoryInformation: any;
  refreshCharacteristics?: () => Promise<ServiceType>;
  setCharacteristic?: (iid: number, value: number | string | boolean) => Promise<ServiceType>;
  getCharacteristic?: (type: string) => CharacteristicType;
  values: any;
}

export interface CharacteristicType {
  aid: number;
  iid: number;
  uuid: string;
  type: string;
  serviceType: string;
  serviceName: string;
  description: string;
  value: number | string | boolean;
  format: 'bool' | 'int' | 'float' | 'string' | 'uint8' | 'uint16' | 'uint32' | 'uint64' | 'data' | 'tlv8' | 'array' | 'dictionary';
  perms: Array<'pr' | 'pw' | 'ev' | 'aa' | 'tw' | 'hd'>;
  unit?: 'unit' | 'percentage' | 'celsius' | 'arcdegrees' | 'lux' | 'seconds';
  maxValue?: number;
  minValue?: number;
  minStep?: number;
  canRead: boolean;
  canWrite: boolean;
  setValue?: (value: number | string | boolean) => Promise<CharacteristicType>;
  getValue?: () => Promise<CharacteristicType>;
}
