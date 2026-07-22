/** A canonical location returned by the local location typeahead. */
export type LocationOption = {
  name: string;
  id: string;
};

/** GET /locations/typeahead */
export type LocationTypeaheadResponse = LocationOption[];
