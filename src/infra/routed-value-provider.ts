import type {
	ProvidedValue,
	ValueProvider,
	ValueQuery
} from "../core/ports/value-provider.port.js"

// Sends each query to the provider of its source.
export class RoutedValueProvider implements ValueProvider {
	constructor(
		private readonly providers: Record<ValueQuery["source"], ValueProvider>
	) {}

	fetch(query: ValueQuery): Promise<ProvidedValue> {
		return this.providers[query.source].fetch(query)
	}
}
