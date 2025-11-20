import { GridCustomCellProps } from "@progress/kendo-react-grid";
import { Employee } from "./employee";
import { CompositeFilterDescriptor, SortDescriptor } from "@progress/kendo-data-query";

export interface GridState {
	sort?: SortDescriptor[];
	take?:number;
	skip?: number;
	filter?: CompositeFilterDescriptor;
}
export interface EditCommandCellProps extends GridCustomCellProps {
	enterEdit: (item: Employee) => void;
}