import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Grid, GridColumn, GridDataStateChangeEvent, GridToolbar, GridSelectionChangeEvent, GridCustomCellProps } from '@progress/kendo-react-grid';
import { process, DataResult } from '@progress/kendo-data-query';
import { AuthContext } from '../logic/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@progress/kendo-react-buttons';
import { deleteUser } from '../firebase/users';
import { AnyUser } from '../models/tygart-user';
import { GridState } from '../models/kendo-models';
import { UserContext } from '../logic/user-context';

const Users: React.FC = () => {
	const { isAdmin } = useContext(AuthContext)!;
	const navigate = useNavigate();
	const {users} = useContext(UserContext)!;
	const [state, setState] = useState<GridState>({ skip: 0, take: 10, sort: [{ field: 'displayName', dir: 'asc' }], filter: undefined });
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [columns] = useState([
		{ field: 'id', title: 'UID', width: 0, hidden: true },
		{ field: 'displayName', title: 'Name' },
		{ field: 'email', title: 'Email'},
		{ field: 'disabled', title: 'Active' }
	]);
	useEffect(() => {
		if (!isAdmin) {
			navigate('/profile');
		}
	}, [isAdmin]);

	const processed = useMemo<DataResult>(() => process(users, state), [users, state]);
	const itemsWithSelection = useMemo(() => {
		const items = (processed.data as AnyUser[]).map((u) => ({ ...u, selected: u.id === selectedId }));
		return { data: items, total: processed.total };
	}, [processed, selectedId]);

	const onDataStateChange = (e: GridDataStateChangeEvent) => {
		const { dataState } = e;
        if (dataState) {
            const { filter, sort, skip, take } = dataState;
            const updatedFilter = filter || dataState.filter;
            const updatedSkip = skip !== undefined ? skip : dataState.skip;
            const updatedTake = take !== undefined ? take : dataState.take;
            setState((prevState) => ({
                ...prevState,
                filter: updatedFilter,
                sort,
                skip: updatedSkip,
                take: updatedTake
            }));
        }
	};

	const onSelectionChange = (e: GridSelectionChangeEvent) => {
		setSelectedId(Object.keys(e.select)[0]);
	};

	const handleAdd = () => {
		navigate('/users/add');
	};

	const handleEdit = () => {
		if (!selectedId) { alert('Please select a user to edit.'); return; }
		const current = users.find((u) => u.id === selectedId);
		if (!current) { alert('Selected user not found'); return; }
		navigate('/users/edit', { state: { user: current } });
	};

	const handleDelete = async () => {
		if (!selectedId) { alert('Please select a user to delete.'); return; }
		if (!window.confirm('Are you sure you want to delete this user record?')) return;
		try {
			await deleteUser(selectedId);
			setSelectedId(null);
		} catch (err) {
			console.error(err);
			alert('Failed to delete user.');
		}
	};

	return (

		<div className="container mx-auto">
			<h2 className="text-2xl font-semibold mb-4">Users</h2>
			{isAdmin ?
				<Grid
					data={itemsWithSelection}
					autoProcessData={true}
					total={processed.total}
					skip={state.skip}
					take={state.take}
					sort={state.sort}
					filter={state.filter}
					pageable={{ buttonCount: 4, pageSizes: [10, 20, 50] }}
					sortable
					filterable
					selectable={{ enabled: true, mode: 'single' }}
					navigatable={true}
					onDataStateChange={onDataStateChange}
					dataItemKey="id"
					onSelectionChange={onSelectionChange}
				>
					{/* Define columns */
					columns.map((column, index) => (
						<GridColumn
							key={index} {...column}/>
					))}
					<GridToolbar>
						<Button themeColor={'primary'} type="button" onClick={handleAdd}>Add</Button>
						&nbsp;
						<Button themeColor={'primary'} type="button" onClick={handleEdit} disabled={!selectedId}>Edit</Button>
						&nbsp;
						<Button themeColor={'error'} type="button" onClick={handleDelete} disabled={!selectedId}>Delete</Button>
					</GridToolbar>
					
				</Grid> : <></>}
		</div>
	);
};

export default Users;
