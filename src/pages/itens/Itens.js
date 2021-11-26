import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { GridActionsCellItem } from '@mui/x-data-grid';
import { ContentHeader, ItensForm, SidePage, Tabela } from 'components';
import { AuthContext } from 'contexts';
import { useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { useStyles } from './Itens.styles';

export default function Itens() {
  const styles = useStyles();
  const abortController = new AbortController();
  const { accessToken } = useContext(AuthContext);
  const [isSidePageOpen, setIsSidePageOpen] = useState(false);
  const [contentHeaderFieldValue, setContentHeaderFieldValue] = useState([]);
  const [preSelectedFields, setPreSelectedFields] = useState({});
  const [rows, setRows] = useState([]);
  const columns = [
    {
      field: 'name',
      headerName: 'Nome',
      flex: 0.25,
    },
    {
      field: 'item_id',
      headerName: 'Número de Patrimônio',
      flex: 0.25,
    },
    {
      field: 'last_mov',
      headerName: 'Última movimentação',
      flex: 0.3,
      type: 'dateTime',
    },
    {
      field: '_id',
      headerName: 'Database ID',
      hide: true,
    },
    {
      field: 'actions',
      headerName: 'Opções',
      type: 'actions',
      getActions: (params) => [
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => deleteItem(params.row)}
        />,
        <GridActionsCellItem
          icon={<ContentCopyIcon />}
          label="Clone"
          onClick={() => duplicateItem(params.row)}
        />,
      ],
    },
  ];

  const onCadastrarNovoClick = () => {
    setIsSidePageOpen(true);
  };

  const onClose = () => {
    setPreSelectedFields([]);
    setIsSidePageOpen(false);
  };

  const prepareData = (data) => {
    delete data._id;
    data.item_id = null;
    data._id = null;
    data.tags = null;
    data.location_blacklist = data.location_blacklist
      ? data.location_blacklist
      : [];
    data.location_whitelist = data.location_whitelist
      ? data.location_whitelist
      : [];
    return data;
  };

  const getRowsRequest = (query) => {
    fetch('https://api.invent-io.ic.unicamp.br/api/v1/search/item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `bearer ${accessToken}`,
      },
      body: JSON.stringify({
        query: query.length ? query.join('|') : '.*',
      }),
      signal: abortController.signal,
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error('Erro ao carregar os itens.');
        }
      })
      .then((data) => {
        const rows = data.map((row) => {
          return {
            id: row.item_id,
            _id: row._id,
            item_id: row.item_id,
            name: row.name,
            last_mov: new Date(1979, 0, 1, 0, 5),
          };
        });
        setRows(rows);
      })
      .catch((error) => {
        if (error.message !== 'The user aborted a request.') {
          toast.error(error.message, {
            position: toast.POSITION.BOTTOM_LEFT,
            autoClose: 4000,
          });
        }
      });
  };

  const deleteItemRequest = (item) => {
    fetch(`https://api.invent-io.ic.unicamp.br/api/v1/item/${item._id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `bearer ${accessToken}`,
      },
    })
      .then((response) => {
        if (response.ok) {
          toast.success(`Item ${item.name} excluído com sucesso`, {
            position: toast.POSITION.BOTTOM_LEFT,
            autoClose: 4000,
          });
          getRowsRequest(contentHeaderFieldValue);
        } else {
          throw new Error(`Erro ao excluir o item ${item.name}`);
        }
      })
      .catch((error) => {
        toast.error(error.message, {
          position: toast.POSITION.BOTTOM_LEFT,
          autoClose: 4000,
        });
      });
  };

  const deleteItem = (item) => {
    Swal.fire({
      title: `Confirmar exclusão?`,
      html: `Deseja realmente excluir o item: <strong>${item.name}</strong>?`,
      showDenyButton: true,
      confirmButtonText: 'Excluir',
      confirmButtonColor: '#dc3545',
      denyButtonText: `Não Excluir`,
      denyButtonColor: '#6c757d',
      icon: 'question',
    }).then((result) => {
      if (result.isConfirmed) {
        deleteItemRequest(item);
      } else if (result.isDenied) {
        Swal.close();
      }
    });
  };

  const duplicateItem = (item) => {
    fetch(`https://api.invent-io.ic.unicamp.br/api/v1/item/${item._id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `bearer ${accessToken}`,
      },
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error('Erro ao buscar informações do item selecionado.');
        }
      })
      .then((data) => {
        const preparedData = prepareData(data);
        setPreSelectedFields(preparedData);
        setIsSidePageOpen(true);
      })
      .catch((error) => {
        toast.error(error.message, {
          position: toast.POSITION.BOTTOM_LEFT,
          autoClose: 4000,
        });
      });
  };

  useEffect(() => {
    getRowsRequest(contentHeaderFieldValue);
    return () => {
      abortController.abort();
    };
  }, [contentHeaderFieldValue]);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageWrapper}>
        <ContentHeader
          title="Itens"
          buttonLabel="Cadastrar novo"
          searchLabel="Pesquisar por item"
          searchPlaceholder="Nome ou Patrimônio"
          onButtonClick={onCadastrarNovoClick}
          setFieldValue={setContentHeaderFieldValue}
        />
        <Tabela columns={columns} rows={rows} />
      </div>
      {isSidePageOpen ? (
        <SidePage onClose={onClose}>
          <ItensForm
            closeSidePage={onClose}
            updateRows={getRowsRequest}
            preSelectedFields={preSelectedFields}
          />
        </SidePage>
      ) : null}
    </div>
  );
}
