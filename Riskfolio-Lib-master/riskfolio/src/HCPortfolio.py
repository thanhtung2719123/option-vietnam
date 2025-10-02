""""""  #

"""
Copyright (c) 2020-2025, Dany Cajas
All rights reserved.
This work is licensed under BSD 3-Clause "New" or "Revised" License.
License available at https://github.com/dcajasn/Riskfolio-Lib/blob/master/LICENSE.txt
"""

import numpy as np
import pandas as pd
import scipy.cluster.hierarchy as hr
from scipy.spatial.distance import squareform
import riskfolio as rp
import riskfolio.src.RiskFunctions as rk
import riskfolio.src.AuxFunctions as af
import riskfolio.src.ParamsEstimation as pe
import riskfolio.src.DBHT as db
import riskfolio.src.GerberStatistic as gs


__all__ = [
    "HCPortfolio",
]


class HCPortfolio(object):
    r"""
    Class that creates a portfolio object with all properties needed to
    calculate optimal portfolios.

    Parameters
    ----------
    returns : DataFrame of shape (n_samples, n_assets), optional
        Assets returns DataFrame, where n_samples is the number of
        observations and n_assets is the number of assets.
        The default is None.
    alpha : float, optional
        Significance level of VaR, CVaR, EVaR, RLVaR, DaR, CDaR, EDaR, RLDaR and Tail Gini of losses.
        The default is 0.05.
    a_sim : float, optional
        Number of CVaRs used to approximate Tail Gini of losses. The default is 100.
    beta : float, optional
        Significance level of CVaR and Tail Gini of gains. If None it duplicates alpha value.
        The default is None.
    b_sim : float, optional
        Number of CVaRs used to approximate Tail Gini of gains. If None it duplicates a_sim value.
        The default is None.
    kappa : float, optional
        Deformation parameter of RLVaR and RLDaR for losses, must be between 0 and 1.
        The default is 0.3.
    kappa_g : float, optional
        Deformation parameter of RLVaR and RLDaR for gains, must be between 0 and 1.
        The default is None.
    solver_rl: str, optional
        Solver available for CVXPY that supports power cone programming. Used to calculate RLVaR and RLDaR.
        The default value is None.
    solvers: list, optional
        List of solvers available for CVXPY used for the selected NCO method.
        The default value is ['CLARABEL', 'SCS', 'ECOS'].
    w_max : pd.Series or float, optional
        Upper bound constraint for hierarchical risk parity weights :cite:`c-Pfitzinger`.
    w_min : pd.Series or float, optional
        Lower bound constraint for hierarchical risk parity weights :cite:`c-Pfitzinger`.
    """

    def __init__(
        self,
        returns=None,
        alpha=0.05,
        a_sim=100,
        beta=None,
        b_sim=None,
        kappa=0.30,
        kappa_g=None,
        solver_rl="CLARABEL",
        solvers=["CLARABEL", "SCS", "ECOS"],
        w_max=None,
        w_min=None,
    ):
        self._returns = returns
        self.alpha = alpha
        self.a_sim = a_sim
        self.beta = beta
        self.b_sim = b_sim
        self._kappa = kappa
        self._kappa_g = kappa_g
        self.solver_rl = solver_rl
        self.solvers = solvers
        self.asset_order = None
        self.clustering = None
        self.cov = None
        self.mu = None
        self.kurt = False
        self.skurt = False
        self.codep = None
        self.codep_sorted = None
        self.w_max = w_max
        self.w_min = w_min

    @property
    def returns(self):
        if self._returns is not None and isinstance(self._returns, pd.DataFrame):
            return self._returns
        else:
            raise NameError("returns must be a DataFrame")

    @returns.setter
    def returns(self, value):
        if value is not None and isinstance(value, pd.DataFrame):
            self._returns = value
        else:
            raise NameError("returns must be a DataFrame")

    @property
    def assetslist(self):
        if self._returns is not None and isinstance(self._returns, pd.DataFrame):
            return self._returns.columns.tolist()

    @property
    def kappa(self):
        return self._kappa

    @kappa.setter
    def kappa(self, value):
        a = value
        if a >= 1:
            print(
                "kappa must be between 0 and 1, values higher or equal to 1 are setting to 0.99"
            )
            self._kappa = 0.99
        elif a <= 0:
            print(
                "kappa must be between 0 and 1, values lower or equal to 0 are setting to 0.01"
            )
            self._kappa = 0.01
        else:
            self._kappa = a

    @property
    def kappa_g(self):
        return self._kappa_g

    @kappa_g.setter
    def kappa_g(self, value):
        a = value
        if a >= 1:
            print(
                "kappa must be between 0 and 1, values higher or equal to 1 are setting to 0.99"
            )
            self._kappa_g = 0.99
        elif a <= 0:
            print(
                "kappa must be between 0 and 1, values lower or equal to 0 are setting to 0.01"
            )
            self._kappa_g = 0.01
        else:
            self._kappa_g = a

    # get naive-risk weights
    def _naive_risk(self, returns, cov, rm="MV", rf=0):
        assets = returns.columns.tolist()
        n = len(assets)

        if rm == "equal":
            weights = np.ones((n, 1)) * 1 / n
        else:
            inv_risk = np.zeros((n, 1))
            for i in assets:
                k = assets.index(i)
                w = np.zeros((n, 1))
                w[k, 0] = 1
                w = pd.DataFrame(w, columns=["weights"], index=assets)
                if rm == "vol":
                    risk = rk.Sharpe_Risk(
                        returns=returns,
                        w=w,
                        cov=cov,
                        rm="MV",
                        rf=rf,
                        alpha=self.alpha,
                        a_sim=self.a_sim,
                        beta=self.beta,
                        b_sim=self.b_sim,
                        kappa=self.kappa,
                        kappa_g=self.kappa_g,
                        solver=self.solver_rl,
                    )
                else:
                    risk = rk.Sharpe_Risk(
                        returns=returns,
                        w=w,
                        cov=cov,
                        rm=rm,
                        rf=rf,
                        alpha=self.alpha,
                        a_sim=self.a_sim,
                        beta=self.beta,
                        b_sim=self.b_sim,
                        kappa=self.kappa,
                        kappa_g=self.kappa_g,
                        solver=self.solver_rl,
                    )
                inv_risk[k, 0] = risk

            if rm == "MV":
                inv_risk = 1 / np.power(inv_risk, 2)
            else:
                inv_risk = 1 / inv_risk
            weights = inv_risk * (1 / np.sum(inv_risk))

        weights = weights.reshape(-1, 1)

        return weights

    # get optimal weights
    def _opt_w(
        self,
        returns,
        mu,
        cov,
        obj="MinRisk",
        rm="MV",
        rf=0,
        l=2,
    ):
        if returns.shape[1] == 1:
            weights = np.array([1]).reshape(-1, 1)
        else:
            if obj in {"MinRisk", "Utility", "Sharpe"}:
                port = rp.Portfolio(
                    returns=returns,
                    alpha=self.alpha,
                    a_sim=self.a_sim,
                    beta=self.beta,
                    b_sim=self.b_sim,
                    kappa=self.kappa,
                    kappa_g=self.kappa_g,
                )

                if self.kurt:
                    method_kurt = "hist"
                elif self.skurt:
                    method_kurt = "hist"
                else:
                    method_kurt = None

                port.assets_stats(
                    method_mu="hist", method_cov="hist", method_kurt=method_kurt
                )
                if self.solvers is not None:
                    port.solvers = self.solvers
                if mu is not None:
                    port.mu = mu
                if cov is not None:
                    port.cov = cov
                weights = port.optimization(
                    model="Classic", rm=rm, obj=obj, rf=rf, l=l, hist=True
                ).to_numpy()
            elif obj in {"ERC"}:
                port = rp.Portfolio(
                    returns=returns,
                    alpha=self.alpha,
                    a_sim=self.a_sim,
                    beta=self.beta,
                    b_sim=self.b_sim,
                    kappa=self.kappa,
                    kappa_g=self.kappa_g,
                )

                if self.kurt:
                    method_kurt = "hist"
                elif self.skurt:
                    method_kurt = "hist"
                else:
                    method_kurt = None
                port.assets_stats(
                    method_mu="hist", method_cov="hist", method_kurt=method_kurt
                )
                if self.solvers is not None:
                    port.solvers = self.solvers
                if mu is not None:
                    port.mu = mu
                if cov is not None:
                    port.cov = cov
                weights = port.rp_optimization(
                    model="Classic", rm=rm, rf=rf, b=None, hist=True
                ).to_numpy()

        weights = weights.reshape(-1, 1)

        return weights

    # Create hierarchical clustering
    def _hierarchical_clustering(
        self,
        model="HRP",
        codependence="pearson",
        linkage="ward",
        opt_k_method="twodiff",
        k=None,
        max_k=10,
        leaf_order=True,
    ):
        # Calculating distance
        if codependence in {
            "pearson",
            "spearman",
            "kendall",
            "gerber1",
            "gerber2",
            "custom_cov",
        }:
            dist = np.sqrt(np.clip((1 - self.codep) / 2, a_min=0.0, a_max=1.0))
        elif codependence in {"abs_pearson", "abs_spearman", "abs_kendall", "distance"}:
            dist = np.sqrt(np.clip((1 - self.codep), a_min=0.0, a_max=1.0))
        elif codependence in {"mutual_info"}:
            dist = af.var_info_matrix(self.returns, self.bins_info).astype(float)
        elif codependence in {"tail"}:
            dist = -np.log(self.codep).astype(float)

        # Hierarchical clustering
        dist = dist.to_numpy()
        dist = pd.DataFrame(dist, columns=self.codep.columns, index=self.codep.index)
        if linkage == "DBHT":
            # different choices for D, S give different outputs!
            D = dist.to_numpy()  # dissimilarity matrix
            if codependence in {
                "pearson",
                "spearman",
                "kendall",
                "gerber1",
                "gerber2",
                "custom_cov",
            }:
                codep = 1 - dist**2
                S = codep.to_numpy()  # similarity matrix
            else:
                S = self.codep.to_numpy()  # similarity matrix
            (_, _, _, _, _, clustering) = db.DBHTs(
                D, S, leaf_order=leaf_order
            )  # DBHT clustering
        else:
            p_dist = squareform(dist, checks=False)
            clustering = hr.linkage(p_dist, method=linkage, optimal_ordering=leaf_order)

        if model in {"HERC", "HERC2", "NCO"}:
            # optimal number of clusters
            if k is None:
                if opt_k_method == "twodiff":
                    k, _ = af.two_diff_gap_stat(dist, clustering, max_k)
                elif opt_k_method == "stdsil":
                    k, _ = af.std_silhouette_score(dist, clustering, max_k)
                else:
                    raise ValueError(
                        "The only opt_k_method available are twodiff and stdsil"
                    )
        else:
            k = None

        return clustering, k

    # sort clustered items by distance
    def _seriation(self, clusters):
        return hr.leaves_list(clusters)

    # compute HRP weight allocation through recursive bisection
    def _recursive_bisection(
        self,
        sort_order,
        rm="MV",
        rf=0,
        upper_bound=None,
        lower_bound=None,
    ):
        weights = pd.Series(1.0, index=self.assetslist)  # set initial weights to 1
        items = [sort_order]

        while len(items) > 0:  # loop while weights is under 100%
            items = [
                i[j:k]
                for i in items
                for j, k in (
                    (0, len(i) // 2),
                    (len(i) // 2, len(i)),
                )  # get cluster indices
                if len(i) > 1
            ]

            # allocate weight to left and right cluster
            for i in range(0, len(items), 2):
                left_cluster = items[i]
                right_cluster = items[i + 1]

                # Left cluster
                left_cov = self.cov.iloc[left_cluster, left_cluster]
                left_returns = self.returns.iloc[:, left_cluster]
                left_weights = self._naive_risk(left_returns, left_cov, rm=rm, rf=rf)

                if rm == "vol":
                    left_risk = rk.Sharpe_Risk(
                        returns=left_returns,
                        w=left_weights,
                        cov=left_cov,
                        rm="MV",
                        rf=rf,
                        alpha=self.alpha,
                        a_sim=self.a_sim,
                        beta=self.beta,
                        b_sim=self.b_sim,
                        kappa=self.kappa,
                        solver=self.solver_rl,
                    )
                else:
                    left_risk = rk.Sharpe_Risk(
                        returns=left_returns,
                        w=left_weights,
                        cov=left_cov,
                        rm=rm,
                        rf=rf,
                        alpha=self.alpha,
                        a_sim=self.a_sim,
                        beta=self.beta,
                        b_sim=self.b_sim,
                        kappa=self.kappa,
                        solver=self.solver_rl,
                    )
                    if rm == "MV":
                        left_risk = np.power(left_risk, 2)

                # Right cluster
                right_cov = self.cov.iloc[right_cluster, right_cluster]
                right_returns = self.returns.iloc[:, right_cluster]
                right_weights = self._naive_risk(right_returns, right_cov, rm=rm, rf=rf)

                if rm == "vol":
                    right_risk = rk.Sharpe_Risk(
                        returns=right_returns,
                        w=right_weights,
                        cov=right_cov,
                        rm="MV",
                        rf=rf,
                        alpha=self.alpha,
                        a_sim=self.a_sim,
                        beta=self.beta,
                        b_sim=self.b_sim,
                        kappa=self.kappa,
                        solver=self.solver_rl,
                    )
                else:
                    right_risk = rk.Sharpe_Risk(
                        returns=right_returns,
                        w=right_weights,
                        cov=right_cov,
                        rm=rm,
                        rf=rf,
                        alpha=self.alpha,
                        a_sim=self.a_sim,
                        beta=self.beta,
                        b_sim=self.b_sim,
                        kappa=self.kappa,
                        solver=self.solver_rl,
                    )
                    if rm == "MV":
                        right_risk = np.power(right_risk, 2)

                # Allocate weight to clusters
                alpha_1 = 1 - left_risk / (left_risk + right_risk)

                weights.iloc[left_cluster] *= alpha_1  # weight 1
                weights.iloc[right_cluster] *= 1 - alpha_1  # weight 2

        return weights

    # compute HERC weight allocation through cluster-based bisection
    def _hierarchical_recursive_bisection(
        self,
        Z,
        rm="MV",
        rf=0,
        linkage="ward",
        model="HERC",
        upper_bound=None,
        lower_bound=None,
    ):
        # Transform linkage to tree and reverse order
        root, nodes = hr.to_tree(Z, rd=True)
        nodes = np.array(nodes)
        nodes_1 = np.array([i.dist for i in nodes])
        idx = np.argsort(nodes_1)
        nodes = nodes[idx][::-1].tolist()
        weights = pd.Series(1.0, index=self.assetslist)  # Set initial weights to 1

        clustering_inds = hr.fcluster(Z, self.k, criterion="maxclust")
        clusters = {
            i: [] for i in range(min(clustering_inds), max(clustering_inds) + 1)
        }
        for i, v in enumerate(clustering_inds):
            clusters[v].append(i)

        # Loop through k clusters
        for i in nodes[: self.k - 1]:
            if i.is_leaf() == False:  # skip leaf-nodes
                left = i.get_left().pre_order()  # lambda i: i.id) # get left cluster
                right = i.get_right().pre_order()  # lambda i: i.id) # get right cluster
                left_set = set(left)
                right_set = set(right)
                left_risk = 0
                right_risk = 0
                left_cluster = []
                right_cluster = []

                # Allocate weight to clusters
                if rm == "equal":
                    alpha_1 = 0.5

                else:
                    for j in clusters.keys():
                        if set(clusters[j]).issubset(left_set):
                            # Left cluster
                            left_cov = self.cov.iloc[clusters[j], clusters[j]]
                            left_returns = self.returns.iloc[:, clusters[j]]
                            left_weights = self._naive_risk(
                                left_returns, left_cov, rm=rm, rf=rf
                            )

                            if rm == "vol":
                                left_risk_ = rk.Sharpe_Risk(
                                    returns=left_returns,
                                    w=left_weights,
                                    cov=left_cov,
                                    rm="MV",
                                    rf=rf,
                                    alpha=self.alpha,
                                    a_sim=self.a_sim,
                                    beta=self.beta,
                                    b_sim=self.b_sim,
                                    kappa=self.kappa,
                                    kappa_g=self.kappa_g,
                                    solver=self.solver_rl,
                                )
                            else:
                                left_risk_ = rk.Sharpe_Risk(
                                    returns=left_returns,
                                    w=left_weights,
                                    cov=left_cov,
                                    rm=rm,
                                    rf=rf,
                                    alpha=self.alpha,
                                    a_sim=self.a_sim,
                                    beta=self.beta,
                                    b_sim=self.b_sim,
                                    kappa=self.kappa,
                                    kappa_g=self.kappa_g,
                                    solver=self.solver_rl,
                                )
                                if rm == "MV":
                                    left_risk_ = np.power(left_risk_, 2)

                            left_risk += left_risk_
                            left_cluster += clusters[j]

                        elif set(clusters[j]).issubset(right_set):
                            # Right cluster
                            right_cov = self.cov.iloc[clusters[j], clusters[j]]
                            right_returns = self.returns.iloc[:, clusters[j]]
                            right_weights = self._naive_risk(
                                right_returns, right_cov, rm=rm, rf=rf
                            )

                            if rm == "vol":
                                right_risk_ = rk.Sharpe_Risk(
                                    returns=right_returns,
                                    w=right_weights,
                                    cov=right_cov,
                                    rm="MV",
                                    rf=rf,
                                    alpha=self.alpha,
                                    a_sim=self.a_sim,
                                    beta=self.beta,
                                    b_sim=self.b_sim,
                                    kappa=self.kappa,
                                    kappa_g=self.kappa_g,
                                    solver=self.solver_rl,
                                )
                            else:
                                right_risk_ = rk.Sharpe_Risk(
                                    returns=right_returns,
                                    w=right_weights,
                                    cov=right_cov,
                                    rm=rm,
                                    rf=rf,
                                    alpha=self.alpha,
                                    a_sim=self.a_sim,
                                    beta=self.beta,
                                    b_sim=self.b_sim,
                                    kappa=self.kappa,
                                    kappa_g=self.kappa_g,
                                    solver=self.solver_rl,
                                )
                                if rm == "MV":
                                    right_risk_ = np.power(right_risk_, 2)

                            right_risk += right_risk_
                            right_cluster += clusters[j]

                    alpha_1 = 1 - left_risk / (left_risk + right_risk)

                    weights.iloc[left] *= alpha_1  # weight 1
                    weights.iloc[right] *= 1 - alpha_1  # weight 2

        # Get constituents of k clusters
        clustered_assets = pd.Series(
            hr.cut_tree(Z, n_clusters=self.k).flatten(), index=self.cov.index
        )
        # Multiply within-cluster weight with inter-cluster weight
        for i in range(self.k):
            cluster = clustered_assets.loc[clustered_assets == i]
            cluster_cov = self.cov.loc[cluster.index, cluster.index]
            cluster_returns = self.returns.loc[:, cluster.index]
            if model == "HERC":
                cluster_weights = pd.Series(
                    self._naive_risk(
                        cluster_returns, cluster_cov, rm=rm, rf=rf
                    ).flatten(),
                    index=cluster_cov.index,
                )

            elif model == "HERC2":
                cluster_weights = pd.Series(
                    self._naive_risk(
                        cluster_returns, cluster_cov, rm="equal", rf=rf
                    ).flatten(),
                    index=cluster_cov.index,
                )
            weights.loc[cluster_weights.index] *= cluster_weights

        return weights

    # compute intra-cluster weights
    def _intra_weights(
        self,
        Z,
        obj="MinRisk",
        rm="MV",
        rf=0,
        l=2,
    ):
        # Get constituents of k clusters
        clustered_assets = pd.Series(
            hr.cut_tree(Z, n_clusters=self.k).flatten(), index=self.cov.index
        )

        # get covariance matrices for each cluster
        intra_weights = pd.DataFrame(index=clustered_assets.index)
        for i in range(self.k):
            cluster = clustered_assets.loc[clustered_assets == i]
            if self.mu is not None:
                cluster_mu = self.mu.loc[:, cluster.index]
            else:
                cluster_mu = None
            cluster_cov = self.cov.loc[cluster.index, cluster.index]
            cluster_returns = self.returns.loc[:, cluster.index]
            weights = self._opt_w(
                cluster_returns,
                cluster_mu,
                cluster_cov,
                obj=obj,
                rm=rm,
                rf=rf,
                l=l,
            )
            weights = pd.Series(
                weights.flatten(),
                index=cluster_cov.index,
            )
            intra_weights[i] = weights

        intra_weights = intra_weights.fillna(0)
        return intra_weights

    def _inter_weights(
        self,
        intra_weights,
        obj="MinRisk",
        rm="MV",
        rf=0,
        l=2,
    ):
        # inter-cluster mean vector
        if self.mu is not None:
            tot_mu = self.mu @ intra_weights
        else:
            tot_mu = None
        # inter-cluster covariance matrix
        tot_cov = intra_weights.T.dot(np.dot(self.cov, intra_weights))
        # inter-cluster returns matrix
        tot_ret = self.returns @ intra_weights

        # inter-cluster weights
        inter_weights = self._opt_w(
            tot_ret,
            tot_mu,
            tot_cov,
            obj=obj,
            rm=rm,
            rf=rf,
            l=l,
        )
        inter_weights = pd.Series(inter_weights.flatten(), index=intra_weights.columns)
        # determine the weight on each cluster by multiplying the intra-cluster weight with the inter-cluster weight
        weights = intra_weights.mul(inter_weights, axis=1).sum(axis=1).sort_index()

        return weights

    # Allocate weights
    def optimization(
        self,
        model="HRP",
        codependence="pearson",
        obj="MinRisk",
        rm="MV",
        rf=0,
        l=2,
        method_mu="hist",
        method_cov="hist",
        custom_mu=None,
        custom_cov=None,
        linkage="single",
        opt_k_method="twodiff",
        k=None,
        max_k=10,
        bins_info="KN",
        alpha_tail=0.05,
        gs_threshold=0.5,
        leaf_order=True,
        dict_mu={},
        dict_cov={},
    ):
        r"""
        This method calculates the optimal portfolio according to the
        optimization model selected by the user.

        Parameters
        ----------
        model : str, optional
            The hierarchical cluster portfolio model used for optimize the
            portfolio. The default is 'HRP'. Possible values are:

            - 'HRP': Hierarchical Risk Parity.
            - 'HERC': Hierarchical Equal Risk Contribution.
            - 'HERC2': HERC but splitting weights equally within clusters.
            - 'NCO': Nested Clustered Optimization.

        codependence : str, optional
            The codependence or similarity matrix used to build the distance
            metric and clusters. The default is 'pearson'. Possible values are:

            - 'pearson': pearson correlation matrix. Distance formula: :math:`D_{i,j} = \sqrt{0.5(1-\rho^{pearson}_{i,j})}`.
            - 'spearman': spearman correlation matrix. Distance formula: :math:`D_{i,j} = \sqrt{0.5(1-\rho^{spearman}_{i,j})}`.
            - 'kendall': kendall correlation matrix. Distance formula: :math:`D_{i,j} = \sqrt{0.5(1-\rho^{kendall}_{i,j})}`.
            - 'gerber1': Gerber statistic 1 correlation matrix. Distance formula: :math:`D_{i,j} = \sqrt{0.5(1-\rho^{gerber1}_{i,j})}`.
            - 'gerber2': Gerber statistic 2 correlation matrix. Distance formula: :math:`D_{i,j} = \sqrt{0.5(1-\rho^{gerber2}_{i,j})}`.
            - 'abs_pearson': absolute value pearson correlation matrix. Distance formula: :math:`D_{i,j} = \sqrt{(1-|\rho^{pearson}_{i,j}|)}`.
            - 'abs_spearman': absolute value spearman correlation matrix. Distance formula: :math:`D_{i,j} = \sqrt{(1-|\rho^{spearman}_{i,j}|)}`.
            - 'abs_kendall': absolute value kendall correlation matrix. Distance formula: :math:`D_{i,j} = \sqrt{(1-|\rho^{kendall}_{i,j}|)}`.
            - 'distance': distance correlation matrix. Distance formula :math:`D_{i,j} = \sqrt{(1-\rho^{distance}_{i,j})}`.
            - 'mutual_info': mutual information matrix. Distance used is variation information matrix.
            - 'tail': lower tail dependence index matrix. Dissimilarity formula :math:`D_{i,j} = -\log{\lambda_{i,j}}`.
            - 'custom_cov': use custom correlation matrix based on the custom_cov parameter. Distance formula: :math:`D_{i,j} = \sqrt{0.5(1-\rho^{pearson}_{i,j})}`.

        obj : str, optional
            Objective function used by the NCO model.
            The default is 'MinRisk'. Possible values are:

            - 'MinRisk': Minimize the selected risk measure.
            - 'Utility': Maximize the Utility function :math:`\mu w - l \phi_{i}(w)`.
            - 'Sharpe': Maximize the risk adjusted return ratio based on the selected risk measure.
            - 'ERC': Equally risk contribution portfolio of the selected risk measure.

        rm : str, optional
            The risk measure used to optimize the portfolio. If model is 'NCO',
            the risk measures available depends on the objective function.
            The default is 'MV'. Possible values are:

            - 'equal': Equally weighted.
            - 'vol': Standard Deviation.
            - 'MV': Variance.
            - 'KT': Square Root Kurtosis.
            - 'MAD': Mean Absolute Deviation.
            - 'MSV': Semi Standard Deviation.
            - 'SKT': Square Root Semi Kurtosis.
            - 'FLPM': First Lower Partial Moment (Omega Ratio).
            - 'SLPM': Second Lower Partial Moment (Sortino Ratio).
            - 'VaR': Value at Risk.
            - 'CVaR': Conditional Value at Risk.
            - 'TG': Tail Gini.
            - 'EVaR': Entropic Value at Risk.
            - 'RLVaR': Relativistic Value at Risk. I recommend only use this function with MOSEK solver.
            - 'WR': Worst Realization (Minimax).
            - 'VRG' VaR range of returns.
            - 'CVRG': CVaR range of returns.
            - 'TGRG': Tail Gini range of returns.
            - 'EVRG': EVaR range of returns.
            - 'RVRG': RLVaR range of returns. I recommend only use this function with MOSEK solver.
            - 'MDD': Maximum Drawdown of uncompounded cumulative returns (Calmar Ratio).
            - 'ADD': Average Drawdown of uncompounded cumulative returns.
            - 'DaR': Drawdown at Risk of uncompounded cumulative returns.
            - 'CDaR': Conditional Drawdown at Risk of uncompounded cumulative returns.
            - 'EDaR': Entropic Drawdown at Risk of uncompounded cumulative returns.
            - 'RLDaR': Relativistic Drawdown at Risk of uncompounded cumulative returns. I recommend only use this function with MOSEK solver.
            - 'UCI': Ulcer Index of uncompounded cumulative returns.
            - 'MDD_Rel': Maximum Drawdown of compounded cumulative returns (Calmar Ratio).
            - 'ADD_Rel': Average Drawdown of compounded cumulative returns.
            - 'DaR_Rel': Drawdown at Risk of compounded cumulative returns.
            - 'CDaR_Rel': Conditional Drawdown at Risk of compounded cumulative returns.
            - 'EDaR_Rel': Entropic Drawdown at Risk of compounded cumulative returns.
            - 'RLDaR_Rel': Relativistic Drawdown at Risk of compounded cumulative returns. I recommend only use this function with MOSEK solver.
            - 'UCI_Rel': Ulcer Index of compounded cumulative returns.

        rf : float, optional
            Risk free rate, must be in the same period of assets returns.
            The default is 0.
        l : scalar, optional
            Risk aversion factor of the 'Utility' objective function.
            The default is 2.
        method_mu : str, optional
            The method used to estimate the expected returns vector.
            The default value is 'hist'. Possible values are:

            - 'hist': use historical estimator.
            - 'ewma1': use ewma with adjust=True. For more information see `EWM <https://pandas.pydata.org/pandas-docs/stable/user_guide/window.html#exponentially-weighted-window>`_.
            - 'ewma2': use ewma with adjust=False. For more information see `EWM <https://pandas.pydata.org/pandas-docs/stable/user_guide/window.html#exponentially-weighted-window>`_.
            - 'JS': James-Stein estimator. For more information see :cite:`c-Meucci2005` and :cite:`c-Feng2016`.
            - 'BS': Bayes-Stein estimator. For more information see :cite:`c-Jorion1986`.
            - 'BOP': BOP estimator. For more information see :cite:`c-Bodnar2019`.
            - 'custom_mu': use custom expected returns vector.

        method_cov : str, optional
            The method used to estimate the covariance matrix:
            The default is 'hist'. Possible values are:

            - 'hist': use historical estimates.
            - 'ewma1': use ewma with adjust=True. For more information see `EWM <https://pandas.pydata.org/pandas-docs/stable/user_guide/window.html#exponentially-weighted-window>`_.
            - 'ewma2': use ewma with adjust=False. For more information see `EWM <https://pandas.pydata.org/pandas-docs/stable/user_guide/window.html#exponentially-weighted-window>`_.
            - 'ledoit': use the Ledoit and Wolf Shrinkage method.
            - 'oas': use the Oracle Approximation Shrinkage method.
            - 'shrunk': use the basic Shrunk Covariance method.
            - 'gl': use the basic Graphical Lasso Covariance method.
            - 'jlogo': use the j-LoGo Covariance method. For more information see: :cite:`c-jLogo`.
            - 'fixed': denoise using fixed method. For more information see chapter 2 of :cite:`c-MLforAM`.
            - 'spectral': denoise using spectral method. For more information see chapter 2 of :cite:`c-MLforAM`.
            - 'shrink': denoise using shrink method. For more information see chapter 2 of :cite:`c-MLforAM`.
            - 'gerber1': use the Gerber statistic 1. For more information see: :cite:`c-Gerber2021`.
            - 'gerber2': use the Gerber statistic 2. For more information see: :cite:`c-Gerber2021`.
            - 'custom_cov': use custom covariance matrix.

        custom_mu : DataFrame or None, optional
            Custom mean vector when NCO objective is 'Utility' or 'Sharpe'.
            The default is None.
        custom_cov : DataFrame or None, optional
            Custom covariance matrix, used when codependence or covariance
            parameters have value 'custom_cov'. The default is None.
        linkage : string, optional
            Linkage method of hierarchical clustering. For more information see `linkage <https://docs.scipy.org/doc/scipy/reference/generated/scipy.cluster.hierarchy.linkage.html>`_.
            The default is 'single'. Possible values are:

            - 'single'.
            - 'complete'.
            - 'average'.
            - 'weighted'.
            - 'centroid'.
            - 'median'.
            - 'ward'.
            - 'DBHT': Direct Bubble Hierarchical Tree.

        opt_k_method : str
            Method used to calculate the optimum number of clusters.
            The default is 'twodiff'. Possible values are:

            - 'twodiff': two difference gap statistic.
            - 'stdsil': standarized silhouette score.

        k : int, optional
            Number of clusters. This value is took instead of the optimal number
            of clusters calculated with the two difference gap statistic.
            The default is None.
        max_k : int, optional
            Max number of clusters used by the two difference gap statistic
            to find the optimal number of clusters. The default is 10.
        bins_info: int or str
            Number of bins used to calculate variation of information. The default
            value is 'KN'. Possible values are:

            - 'KN': Knuth's choice method. See more in `knuth_bin_width <https://docs.astropy.org/en/stable/api/astropy.stats.knuth_bin_width.html>`_.
            - 'FD': Freedman–Diaconis' choice method. See more in `freedman_bin_width <https://docs.astropy.org/en/stable/api/astropy.stats.freedman_bin_width.html>`_.
            - 'SC': Scotts' choice method. See more in `scott_bin_width <https://docs.astropy.org/en/stable/api/astropy.stats.scott_bin_width.html>`_.
            - 'HGR': Hacine-Gharbi and Ravier' choice method.
            - int: integer value choice by user.

        alpha_tail : float, optional
            Significance level for lower tail dependence index. The default is 0.05.
        gs_threshold : float, optional
            Gerber statistic threshold. The default is 0.5.
        leaf_order : bool, optional
            Indicates if the cluster are ordered so that the distance between
            successive leaves is minimal. The default is True.
        dict_mu : dict
            Other variables related to the mean vector estimation method.
        dict_cov : dict
            Other variables related to the covariance estimation method.

        Returns
        -------
        w : DataFrame
            The weights of optimal portfolio.

        See Also
        --------
        riskfolio.src.ParamsEstimation.mean_vector
        riskfolio.src.ParamsEstimation.covar_matrix
        """

        # Covariance matrix
        if method_cov == "custom_cov":
            if isinstance(custom_cov, pd.DataFrame) == True:
                if custom_cov.shape[0] != custom_cov.shape[1]:
                    raise NameError("custom_cov must be a square DataFrame")
                else:
                    self.cov = custom_cov.copy()
        else:
            self.cov = pe.covar_matrix(self.returns, method=method_cov, **dict_cov)

        # Mean vector
        if method_mu == "custom_mu":
            if isinstance(custom_mu, pd.Series) == True:
                self.mu = custom_mu.to_frame().T
            elif isinstance(custom_mu, pd.DataFrame) == True:
                if custom_mu.shape[0] > 1 and custom_mu.shape[1] == 1:
                    self.mu = custom_mu.copy()
                elif custom_mu.shape[0] == 1 and custom_mu.shape[1] > 1:
                    self.mu = custom_mu.copy()
                else:
                    raise NameError("custom_mu must be a column DataFrame")
            else:
                raise NameError("custom_mu must be a column DataFrame or Series")
        else:
            self.mu = pe.mean_vector(self.returns, method=method_mu, **dict_mu)
        if rm == "KT":
            self.kurt, self.skurt = True, False
        elif rm == "SKT":
            self.kurt, self.skurt = False, True
        else:
            self.kurt, self.skurt = False, False

        self.codependence = codependence
        self.linkage = linkage
        self.opt_k_method = opt_k_method
        self.k = k
        self.max_k = max_k
        self.bins_info = bins_info
        self.alpha_tail = alpha_tail
        self.gs_threshold = gs_threshold
        self.leaf_order = leaf_order

        # Codependence matrix
        if self.codependence in {"pearson", "spearman", "kendall"}:
            self.codep = self.returns.corr(method=self.codependence).astype(float)
        elif self.codependence == "gerber1":
            self.codep = gs.gerber_cov_stat1(self.returns, threshold=self.gs_threshold)
            self.codep = af.cov2corr(self.codep).astype(float)
        elif self.codependence == "gerber2":
            self.codep = gs.gerber_cov_stat2(self.returns, threshold=self.gs_threshold)
            self.codep = af.cov2corr(self.codep).astype(float)
        elif self.codependence in {"abs_pearson", "abs_spearman", "abs_kendall"}:
            self.codep = np.abs(self.returns.corr(method=self.codependence[4:])).astype(
                float
            )
        elif self.codependence in {"distance"}:
            self.codep = af.dcorr_matrix(self.returns).astype(float)
        elif self.codependence in {"mutual_info"}:
            self.codep = af.mutual_info_matrix(self.returns, self.bins_info).astype(
                float
            )
        elif self.codependence in {"tail"}:
            self.codep = af.ltdi_matrix(self.returns, alpha=self.alpha_tail).astype(
                float
            )
        elif self.codependence in {"custom_cov"}:
            self.codep = af.cov2corr(custom_cov).astype(float)

        # Step-1: Tree clustering
        self.clustering, self.k = self._hierarchical_clustering(
            model,
            self.codependence,
            self.linkage,
            self.opt_k_method,
            self.k,
            self.max_k,
            self.leaf_order,
        )
        if k is not None:
            self.k = int(k)

        # Step-2: Seriation (Quasi-Diagnalization)
        self.sort_order = self._seriation(self.clustering)
        # asset_order = self.assetslist
        asset_order = [self.assetslist[i] for i in self.sort_order]
        self.asset_order = asset_order.copy()
        self.codep_sorted = self.codep.reindex(
            index=self.asset_order, columns=self.asset_order
        )

        # Step-2.1: Bound creation
        if self.w_max is None:
            upper_bound = pd.Series(1.0, index=self.assetslist)
        elif isinstance(self.w_max, int) or isinstance(self.w_max, float):
            upper_bound = pd.Series(self.w_max, index=self.assetslist)
            upper_bound = np.minimum(1.0, upper_bound).loc[self.assetslist]
            if upper_bound.sum() < 1:
                raise NameError("Sum of upper bounds must be higher equal than 1")
        elif isinstance(self.w_max, pd.Series):
            upper_bound = np.minimum(1.0, self.w_max).loc[self.assetslist]
            if upper_bound.sum() < 1.0:
                raise NameError("Sum of upper bounds must be higher equal than 1")

        if self.w_min is None:
            lower_bound = pd.Series(0.0, index=self.assetslist)
        elif isinstance(self.w_min, int) or isinstance(self.w_min, float):
            lower_bound = pd.Series(self.w_min, index=self.assetslist)
            lower_bound = np.maximum(0.0, lower_bound).loc[self.assetslist]
        elif isinstance(self.w_min, pd.Series):
            lower_bound = np.maximum(0.0, self.w_min).loc[self.assetslist]

        if (upper_bound >= lower_bound).all().item() is False:
            raise NameError("All upper bounds must be higher than lower bounds")

        # Step-3: Recursive bisection
        if model == "HRP":
            # Recursive bisection
            weights = self._recursive_bisection(
                self.sort_order,
                rm=rm,
                rf=rf,
                upper_bound=upper_bound,
                lower_bound=lower_bound,
            )
        elif model in ["HERC", "HERC2"]:
            # Cluster-based Recursive bisection
            weights = self._hierarchical_recursive_bisection(
                self.clustering,
                rm=rm,
                rf=rf,
                linkage=linkage,
                model=model,
                upper_bound=upper_bound,
                lower_bound=lower_bound,
            )
        elif model == "NCO":
            # Step-3.1: Determine intra-cluster weights
            intra_weights = self._intra_weights(
                self.clustering,
                obj=obj,
                rm=rm,
                rf=rf,
                l=l,
            )

            # Step-3.2: Determine inter-cluster weights and multiply with 􏰁→ intra-cluster weights
            weights = self._inter_weights(intra_weights, obj=obj, rm=rm, rf=rf, l=l)

        weights = weights.loc[self.assetslist]

        # Step-4: Fit weights to constraints
        if (upper_bound < weights).any().item() or (lower_bound > weights).any().item():
            max_iter = 100
            j = 0
            while (
                (upper_bound < weights).any().item()
                or (lower_bound > weights).any().item()
            ) and (j < max_iter):
                weights_original = weights.copy()
                weights = np.maximum(np.minimum(weights, upper_bound), lower_bound)
                tickers_mod = weights[
                    (weights < upper_bound) & (weights > lower_bound)
                ].index.tolist()

                weights_add = np.maximum(weights_original - upper_bound, 0).sum()
                weights_sub = np.minimum(weights_original - lower_bound, 0).sum()
                delta = weights_add + weights_sub

                if delta != 0:
                    weights[tickers_mod] += (
                        delta * weights[tickers_mod] / weights[tickers_mod].sum()
                    )

                j += 1

        weights = weights.loc[self.assetslist].to_frame()
        weights.columns = ["weights"]

        return weights
