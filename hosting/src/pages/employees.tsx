import React, {useState, useContext, useEffect, useMemo} from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../logic/AuthContext";
import { EditDescriptor } from "@progress/kendo-react-data-tools";
import { Grid, GridColumn, GridCustomCellProps, GridDataStateChangeEvent, GridFilterChangeEvent, GridSelectionChangeEvent, GridToolbar } from "@progress/kendo-react-grid";
import { CompositeFilterDescriptor, SortDescriptor, process } from "@progress/kendo-data-query";
import { Button } from "@progress/kendo-react-buttons";
import { editEmployee, deleteEmployee } from "../firebase/firestore";
import { Employee } from "../models/employee";
import EmployeeEdit from "../components/form/employee-edit";
import { EmployeeContext } from "../logic/EmployeeContext";

interface GridState {
	sort?: SortDescriptor[];
	take?:number;
	skip?: number;
	filter?: CompositeFilterDescriptor;
}
interface EditCommandCellProps extends GridCustomCellProps {
	enterEdit: (item: Employee) => void;
}

const EditCommandCell = (props: EditCommandCellProps) => {
	return (
		<td {...props.tdProps}>
			<Button themeColor={'primary'} type="button" onClick={() => props.enterEdit(props.dataItem)}>
				Edit
			</Button>
		</td>
	);
};
export default function Employees(){
const navigate = useNavigate();
	const context = useContext<AuthContext | null>(AuthContext);
	const {employees} = useContext<EmployeeContext>(EmployeeContext);
	// Redirect non-admins to their profile
	useEffect(() => {
		if (context && !context.isAdmin) {
			navigate('/profile');
		}
	}, [context?.isAdmin, navigate]);
	const [edit, setEdit] = useState<EditDescriptor>({});
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const MyEditCommandCell = (props: GridCustomCellProps) => <EditCommandCell {...props} enterEdit={enterEdit}/>;
	// Find the item currently marked for edit (EditDescriptor is a map of id -> true)
	const editItem = useMemo(() => {
		const keys = Object.keys(edit || {});
		if (!keys.length) return null;
		const id = keys[0];
		return employees.find(e => e.id === id) || null;
	}, [edit, employees]);
	const [dataState, setDataState] = useState<GridState>({
		filter: {logic: 'and', filters:[]},
		skip: 0,
		take: 10,
		sort: [{field: 'fullname', dir: 'asc'}]
	});
	const [columns] = useState([
		{field: 'id', title: 'ID', width: 0, hidden: true},
		{field: 'fullname', title: 'Name', width: 200},
		{field: 'skillNames', title: 'Skills', width: 200},
		{field: 'certificationNames', title: 'Certifications', width:200},
		{field: 'educationNames', title: 'Education', width: 200},
		{field: 'otherTrainingNames', title: 'Other Training', width: 200},
		{field: 'clearanceLevel', title: 'Clearance', width: 200},
		{ width: 150, title: '', cell: MyEditCommandCell, sortable: false, filterable: false }
	]);
	const enterEdit = (e: Employee) => {
		if(!e.id){
			return;
		}
		setEdit({[e.id]: true});
	};
	const handleCancelEdit = ()=>{
		setEdit({});
	}
	
	const saveChanges = (newEmp: Employee) => {
		editEmployee(newEmp).then(()=>{
			console.log("Employee updated successfully");
			setEdit({});
		}).catch((error)=>{
			console.error("Error updating employee: ", error);
		});
		
	};
	const onDeleteClick = async () => {
		if (!selectedId) {
			alert('Please select an employee to delete.');
			return;
		}
		const target = employees.find(e => e.id === selectedId);
		if (!target) {
			alert('Selected employee not found.');
			return;
		}
		if (!window.confirm(`Delete ${target.fullname || 'this employee'}? This cannot be undone.`)) {
		 return;
		}
		try {
			await deleteEmployee(selectedId);
			setSelectedId(null);
		} catch (err) {
			console.error(err);
			alert('Failed to delete employee.');
		}
	};
	    const onDataStateChange = (event: GridDataStateChangeEvent) => {
        const { dataState } = event;
        if (dataState) {
            const { filter, sort, skip, take } = dataState;
            const updatedFilter = filter || dataState.filter;
            const updatedSkip = skip !== undefined ? skip : dataState.skip;
            const updatedTake = take !== undefined ? take : dataState.take;
            setDataState((prevState) => ({
                ...prevState,
                filter: updatedFilter,
                sort,
                skip: updatedSkip,
                take: updatedTake
            }));
        }
    };
		const onEditClick = () => {
			if (!selectedId) {
				alert('Please select an employee to edit.');
				return;
			}
			const selected = employees.find(e => e.id === selectedId);
			if (!selected) {
				alert('Selected employee not found.');
				return;
			}
			navigate('/addemployee', { state: { employee: selected } });
		};

    const onFilterChange = (event: GridFilterChangeEvent) => {
        const newFilter = event.filter ? { ...event.filter } : { logic: 'and', filters: [] };

        setDataState((prevState: any) => ({
            ...prevState,
            filter: newFilter
        }));
    };

    const onPageChange = (event: any) => {
        const newSkip = event.page.skip;
        const newTake = event.page.take;
        setDataState((prevState) => ({
            ...prevState,
            skip: newSkip,
            take: newTake
        }));
    };
		const onSelectionChange = (event:GridSelectionChangeEvent) => {
			//console.log(Object.keys(event.select)[0]);
			setSelectedId(Object.keys(event.select)[0]);
		}
	
	const processedData = process(employees, {
        filter: dataState.filter,
        sort: dataState.sort,
        skip: dataState.skip,
        take: dataState.take
    });
	
		// add selection marker to processed data
		const dataWithSelection = useMemo(() => ({
			data: (processedData.data as any[]).map((it: any) => ({ ...it, selected: it.id === selectedId })),
			total: processedData.total
		}), [processedData, selectedId]);

		return (
		<div className="flex flex-col min-h-screen">
			
			<h2>Employee Portal</h2>
			<p>Welcome to the employee portal. This is a database for the management to store, retrieve and search employee data.</p>
			{!context?.currentUser ?
				<button onClick={() => navigate("/login")}>Sign In</button> : employees.length > 0 ?
					(<><Grid 
						edit={edit}
						sortable={true}
						onSelectionChange={onSelectionChange}
                sort={dataState.sort}
                filterable={true}
                resizable={true}
                reorderable={true}
                pageable={{ buttonCount: 4, pageSizes: true }}
						data={dataWithSelection}
						dataItemKey="id"
						navigatable={true}
						selectable={{ enabled: true, mode: 'single' }}
                filter={dataState.filter}
                onFilterChange={onFilterChange}
                onDataStateChange={onDataStateChange}
                skip={dataState.skip}
                take={dataState.take}
                onPageChange={onPageChange}>
{columns.map((column, index) => {
                    return <GridColumn key={index} {...column} />;
                })}
                <GridToolbar>
					<Button themeColor={'primary'} type="button" onClick={()=>navigate('/addemployee')} title="Add Employee">
						Add Employee
					</Button>
					&nbsp;
					<Button themeColor={'primary'} type="button" onClick={onEditClick} title="Edit Selected Employee">
						Edit Selected Employee
					</Button>
					&nbsp;
					<Button themeColor={'error'} type="button" onClick={onDeleteClick} title="Delete Selected Employee">
						Delete Selected Employee
					</Button>
                </GridToolbar>
						</Grid>{editItem ? <EmployeeEdit employee={editItem} onClose={handleCancelEdit} onSave={saveChanges} />: null
						} </>): <div>Loading...</div>
			}
		</div>
		
	);
}
